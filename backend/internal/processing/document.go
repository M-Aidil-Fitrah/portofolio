package processing

import (
	"archive/zip"
	"bytes"
	"context"
	"errors"
	"fmt"
	"io"
	"net/url"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"unicode/utf8"
)

var ErrUnsupportedDocument = errors.New("unsupported document")

type DocumentProcessor struct {
	LibreOffice string
	PDFInfo     string
	PDFToPPM    string
	ImageBinary string
	Sandbox     string
}

type DocumentResult struct {
	PDFPath         string
	ThumbnailPath   string
	ThumbnailWidth  int32
	ThumbnailHeight int32
	PageCount       int32
	SourceFormat    string
	Converted       bool
}

func (p DocumentProcessor) Process(
	ctx context.Context,
	source string,
	originalFilename string,
	outputDirectory string,
) (DocumentResult, error) {
	p.defaults()
	extension := strings.ToLower(filepath.Ext(originalFilename))
	if !validDocumentExtension(extension) {
		return DocumentResult{}, ErrUnsupportedDocument
	}
	if err := validateDocumentFile(source, extension); err != nil {
		return DocumentResult{}, err
	}
	if err := os.MkdirAll(outputDirectory, 0o700); err != nil {
		return DocumentResult{}, fmt.Errorf("create document workspace: %w", err)
	}

	pdfPath := filepath.Join(outputDirectory, "preview.pdf")
	converted := extension != ".pdf"
	if converted {
		convertedPath, err := p.convertToPDF(
			ctx,
			source,
			extension,
			outputDirectory,
		)
		if err != nil {
			return DocumentResult{}, err
		}
		if err := copyDocument(convertedPath, pdfPath); err != nil {
			return DocumentResult{}, err
		}
	} else if err := copyDocument(source, pdfPath); err != nil {
		return DocumentResult{}, err
	}
	pageCount, err := p.pdfPageCount(ctx, pdfPath)
	if err != nil || pageCount <= 0 {
		return DocumentResult{}, ErrUnsupportedDocument
	}
	pdfInfo, err := os.Stat(pdfPath)
	if err != nil {
		return DocumentResult{}, err
	}
	if pdfInfo.Size() <= 0 || pdfInfo.Size() > 100<<20 {
		return DocumentResult{}, ErrUnsupportedDocument
	}

	prefix := filepath.Join(outputDirectory, "thumbnail-source")
	if err := p.run(
		ctx,
		p.PDFToPPM,
		"-f", "1",
		"-l", "1",
		"-singlefile",
		"-scale-to-x", "1200",
		"-scale-to-y", "-1",
		"-png",
		pdfPath,
		prefix,
	); err != nil {
		return DocumentResult{}, fmt.Errorf("render document thumbnail: %w", err)
	}
	thumbnail, err := (ImageProcessor{
		Binary: p.ImageBinary,
	}).renderWebP(
		ctx,
		prefix+".png",
		outputDirectory,
		"thumbnail",
		"",
		false,
	)
	if err != nil {
		return DocumentResult{}, err
	}
	return DocumentResult{
		PDFPath: pdfPath, ThumbnailPath: thumbnail.Path,
		ThumbnailWidth:  thumbnail.Width,
		ThumbnailHeight: thumbnail.Height,
		PageCount:       int32(pageCount),
		SourceFormat:    strings.TrimPrefix(extension, "."),
		Converted:       converted,
	}, nil
}

func (p *DocumentProcessor) defaults() {
	if p.LibreOffice == "" {
		p.LibreOffice = "libreoffice"
	}
	if p.PDFInfo == "" {
		p.PDFInfo = "pdfinfo"
	}
	if p.PDFToPPM == "" {
		p.PDFToPPM = "pdftoppm"
	}
	if p.ImageBinary == "" {
		p.ImageBinary = "magick"
	}
}

func (p DocumentProcessor) convertToPDF(
	ctx context.Context,
	source string,
	extension string,
	outputDirectory string,
) (string, error) {
	inputDirectory := filepath.Join(outputDirectory, "input")
	profile := filepath.Join(outputDirectory, "libreoffice-profile")
	home := filepath.Join(outputDirectory, "home")
	if err := os.MkdirAll(inputDirectory, 0o700); err != nil {
		return "", err
	}
	if err := os.MkdirAll(profile, 0o700); err != nil {
		return "", err
	}
	if err := os.MkdirAll(home, 0o700); err != nil {
		return "", err
	}
	inputExtension := extension
	if extension == ".md" {
		inputExtension = ".txt"
	}
	input := filepath.Join(inputDirectory, "original"+inputExtension)
	if err := copyDocument(source, input); err != nil {
		return "", err
	}
	profileConfig := filepath.Join(profile, "user")
	if err := os.MkdirAll(profileConfig, 0o700); err != nil {
		return "", err
	}
	if err := os.WriteFile(
		filepath.Join(profileConfig, "registrymodifications.xcu"),
		[]byte(macroSecurityConfig),
		0o600,
	); err != nil {
		return "", fmt.Errorf("write LibreOffice security profile: %w", err)
	}
	profileURL := (&url.URL{Scheme: "file", Path: profile}).String()
	args := []string{
		"--headless", "--invisible", "--nologo", "--nodefault",
		"--nolockcheck", "--norestore",
		"-env:UserInstallation=" + profileURL,
		"--convert-to", "pdf",
		"--outdir", outputDirectory,
		input,
	}
	commandName := p.LibreOffice
	if p.Sandbox != "" {
		args = append([]string{
			"--unshare-net", "--die-with-parent",
			"--ro-bind", "/", "/",
			"--dev-bind", "/dev", "/dev",
			"--proc", "/proc",
			"--bind", outputDirectory, outputDirectory,
			"--chdir", outputDirectory,
			p.LibreOffice,
		}, args...)
		commandName = p.Sandbox
	}
	command := exec.CommandContext(ctx, commandName, args...)
	command.Env = append(
		os.Environ(),
		"HOME="+home,
		"TMPDIR="+outputDirectory,
		"XDG_RUNTIME_DIR="+outputDirectory,
		"XDG_CONFIG_HOME="+home,
		"XDG_CACHE_HOME="+home,
		"SAL_DISABLE_OPENCL=1",
		"SAL_USE_VCLPLUGIN=svp",
	)
	output, err := command.CombinedOutput()
	if err != nil {
		return "", fmt.Errorf(
			"convert document: %s: %w",
			limitedOutput(output),
			err,
		)
	}
	converted := filepath.Join(
		outputDirectory,
		strings.TrimSuffix(filepath.Base(input), inputExtension)+".pdf",
	)
	if _, err := os.Stat(converted); err != nil {
		return "", fmt.Errorf(
			"converted PDF not produced: %s",
			limitedOutput(output),
		)
	}
	return converted, nil
}

func (p DocumentProcessor) pdfPageCount(
	ctx context.Context,
	path string,
) (int, error) {
	command := exec.CommandContext(ctx, p.PDFInfo, path)
	output, err := command.CombinedOutput()
	if err != nil {
		return 0, fmt.Errorf("validate PDF: %s: %w", limitedOutput(output), err)
	}
	for _, line := range strings.Split(string(output), "\n") {
		if strings.HasPrefix(line, "Pages:") {
			value := strings.TrimSpace(strings.TrimPrefix(line, "Pages:"))
			return strconv.Atoi(value)
		}
	}
	return 0, ErrUnsupportedDocument
}

func (p DocumentProcessor) run(
	ctx context.Context,
	binary string,
	args ...string,
) error {
	command := exec.CommandContext(ctx, binary, args...)
	output, err := command.CombinedOutput()
	if err != nil {
		return fmt.Errorf("%s: %s: %w", binary, limitedOutput(output), err)
	}
	return nil
}

func validateDocumentFile(path, extension string) error {
	info, err := os.Stat(path)
	if err != nil {
		return err
	}
	if info.Size() <= 0 || info.Size() > 50<<20 {
		return ErrUnsupportedDocument
	}
	header := make([]byte, 8)
	file, err := os.Open(path)
	if err != nil {
		return err
	}
	n, readErr := file.Read(header)
	_ = file.Close()
	if readErr != nil && n == 0 {
		return ErrUnsupportedDocument
	}
	header = header[:n]
	switch extension {
	case ".pdf":
		if !bytes.HasPrefix(header, []byte("%PDF-")) {
			return ErrUnsupportedDocument
		}
	case ".doc", ".ppt", ".xls":
		if !bytes.HasPrefix(
			header,
			[]byte{0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1},
		) {
			return ErrUnsupportedDocument
		}
	case ".docx", ".pptx", ".xlsx", ".odt", ".odp", ".ods":
		if !bytes.HasPrefix(header, []byte("PK")) {
			return ErrUnsupportedDocument
		}
		if err := validateDocumentArchive(path, extension); err != nil {
			return err
		}
	case ".txt", ".md":
		body, err := os.ReadFile(path)
		if err != nil || !utf8.Valid(body) || bytes.IndexByte(body, 0) >= 0 {
			return ErrUnsupportedDocument
		}
	default:
		return ErrUnsupportedDocument
	}
	return nil
}

func validateDocumentArchive(path, extension string) error {
	reader, err := zip.OpenReader(path)
	if err != nil {
		return ErrUnsupportedDocument
	}
	defer reader.Close()
	requiredPrefix := map[string]string{
		".docx": "word/", ".pptx": "ppt/", ".xlsx": "xl/",
	}[extension]
	foundRequired := requiredPrefix == ""
	for _, entry := range reader.File {
		name := strings.ToLower(entry.Name)
		if strings.Contains(name, "vbaproject.bin") ||
			strings.Contains(name, "macrosheets/") {
			return ErrUnsupportedDocument
		}
		if requiredPrefix != "" && strings.HasPrefix(name, requiredPrefix) {
			foundRequired = true
		}
	}
	if !foundRequired {
		return ErrUnsupportedDocument
	}
	if strings.HasPrefix(extension, ".od") {
		for _, entry := range reader.File {
			if entry.Name != "mimetype" {
				continue
			}
			value, err := entry.Open()
			if err != nil {
				return ErrUnsupportedDocument
			}
			body, err := io.ReadAll(io.LimitReader(value, 256))
			_ = value.Close()
			if err != nil ||
				!strings.HasPrefix(
					string(body),
					"application/vnd.oasis.opendocument.",
				) {
				return ErrUnsupportedDocument
			}
			return nil
		}
		return ErrUnsupportedDocument
	}
	return nil
}

func validDocumentExtension(extension string) bool {
	switch extension {
	case ".pdf", ".doc", ".docx", ".ppt", ".pptx", ".xls", ".xlsx",
		".odt", ".odp", ".ods", ".txt", ".md":
		return true
	default:
		return false
	}
}

func copyDocument(source, target string) error {
	input, err := os.Open(source)
	if err != nil {
		return err
	}
	defer input.Close()
	output, err := os.OpenFile(
		target,
		os.O_CREATE|os.O_TRUNC|os.O_WRONLY,
		0o600,
	)
	if err != nil {
		return err
	}
	if _, err := io.Copy(output, input); err != nil {
		_ = output.Close()
		return err
	}
	return output.Close()
}

const macroSecurityConfig = `<?xml version="1.0" encoding="UTF-8"?>
<oor:items xmlns:oor="http://openoffice.org/2001/registry">
  <item oor:path="/org.openoffice.Office.Common/Security/Scripting">
    <prop oor:name="MacroSecurityLevel" oor:op="fuse">
      <value>3</value>
    </prop>
  </item>
</oor:items>`
