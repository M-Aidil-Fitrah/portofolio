package processing

import (
	"archive/zip"
	"context"
	"errors"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func TestDocumentProcessorConvertsOfficeFormats(t *testing.T) {
	t.Parallel()
	binaries := documentBinaries(t)
	workspace := t.TempDir()
	fixtures := createOfficeFixtures(t, binaries.libreOffice, workspace)
	processor := DocumentProcessor{
		LibreOffice: binaries.libreOffice,
		PDFInfo:     binaries.pdfInfo,
		PDFToPPM:    binaries.pdfToPPM,
		ImageBinary: binaries.image,
	}
	for _, fixture := range fixtures {
		fixture := fixture
		t.Run(filepath.Ext(fixture), func(t *testing.T) {
			ctx, cancel := context.WithTimeout(
				context.Background(),
				45*time.Second,
			)
			defer cancel()
			result, err := processor.Process(
				ctx,
				fixture,
				filepath.Base(fixture),
				filepath.Join(workspace, filepath.Base(fixture)+"-output"),
			)
			if err != nil {
				t.Fatalf("Process(%s) error = %v", fixture, err)
			}
			if !result.Converted ||
				result.PageCount < 1 ||
				result.ThumbnailWidth < 1 ||
				result.ThumbnailHeight < 1 {
				t.Fatalf("result = %#v", result)
			}
			assertFileMagic(t, result.PDFPath, []byte("%PDF-"))
			assertFileMagic(t, result.ThumbnailPath, []byte("RIFF"))
		})
	}
}

func TestDocumentProcessorValidatesExistingPDF(t *testing.T) {
	t.Parallel()
	binaries := documentBinaries(t)
	workspace := t.TempDir()
	text := filepath.Join(workspace, "source.txt")
	if err := os.WriteFile(text, []byte("Portfolio document"), 0o600); err != nil {
		t.Fatal(err)
	}
	runLibreOfficeConvert(t, binaries.libreOffice, workspace, text, "pdf")
	pdf := filepath.Join(workspace, "source.pdf")
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	result, err := (DocumentProcessor{
		LibreOffice: binaries.libreOffice,
		PDFInfo:     binaries.pdfInfo,
		PDFToPPM:    binaries.pdfToPPM,
		ImageBinary: binaries.image,
	}).Process(ctx, pdf, "source.pdf", filepath.Join(workspace, "pdf-output"))
	if err != nil {
		t.Fatalf("Process() error = %v", err)
	}
	if result.Converted || result.PageCount != 1 {
		t.Fatalf("result = %#v", result)
	}
}

func TestDocumentValidationRejectsMacroArchive(t *testing.T) {
	t.Parallel()
	path := filepath.Join(t.TempDir(), "macro.docx")
	file, err := os.Create(path)
	if err != nil {
		t.Fatal(err)
	}
	writer := zip.NewWriter(file)
	for _, name := range []string{
		"[Content_Types].xml",
		"word/document.xml",
		"word/vbaProject.bin",
	} {
		entry, err := writer.Create(name)
		if err != nil {
			t.Fatal(err)
		}
		if _, err := entry.Write([]byte("test")); err != nil {
			t.Fatal(err)
		}
	}
	if err := writer.Close(); err != nil {
		t.Fatal(err)
	}
	if err := file.Close(); err != nil {
		t.Fatal(err)
	}
	if err := validateDocumentFile(
		path,
		".docx",
	); !errors.Is(err, ErrUnsupportedDocument) {
		t.Fatalf("validateDocumentFile() error = %v", err)
	}
}

type documentTestBinaries struct {
	libreOffice string
	pdfInfo     string
	pdfToPPM    string
	image       string
}

func documentBinaries(t *testing.T) documentTestBinaries {
	t.Helper()
	values := documentTestBinaries{}
	var err error
	if values.libreOffice, err = exec.LookPath("libreoffice"); err != nil {
		t.Skip("LibreOffice is not installed")
	}
	if values.pdfInfo, err = exec.LookPath("pdfinfo"); err != nil {
		t.Skip("pdfinfo is not installed")
	}
	if values.pdfToPPM, err = exec.LookPath("pdftoppm"); err != nil {
		t.Skip("pdftoppm is not installed")
	}
	if values.image, err = exec.LookPath("magick"); err != nil {
		t.Skip("ImageMagick is not installed")
	}
	return values
}

func createOfficeFixtures(
	t *testing.T,
	libreOffice string,
	workspace string,
) []string {
	t.Helper()
	html := filepath.Join(workspace, "document.html")
	if err := os.WriteFile(
		html,
		[]byte("<html><body><h1>Portfolio</h1><p>Activity document</p></body></html>"),
		0o600,
	); err != nil {
		t.Fatal(err)
	}
	fodp := filepath.Join(workspace, "presentation.fodp")
	if err := os.WriteFile(fodp, []byte(flatPresentation), 0o600); err != nil {
		t.Fatal(err)
	}
	fods := filepath.Join(workspace, "spreadsheet.fods")
	if err := os.WriteFile(fods, []byte(flatSpreadsheet), 0o600); err != nil {
		t.Fatal(err)
	}
	runLibreOfficeConvert(
		t, libreOffice, workspace, html,
		"docx:Office Open XML Text",
	)
	runLibreOfficeConvert(
		t, libreOffice, workspace, fodp,
		"pptx:Impress MS PowerPoint 2007 XML",
	)
	runLibreOfficeConvert(
		t, libreOffice, workspace, fods,
		"xlsx:Calc MS Excel 2007 XML",
	)
	return []string{
		filepath.Join(workspace, "document.docx"),
		filepath.Join(workspace, "presentation.pptx"),
		filepath.Join(workspace, "spreadsheet.xlsx"),
	}
}

func runLibreOfficeConvert(
	t *testing.T,
	binary string,
	workspace string,
	source string,
	format string,
) {
	t.Helper()
	profile := filepath.Join(
		workspace,
		"fixture-profile-"+strings.SplitN(format, ":", 2)[0],
	)
	profileURL := "file://" + filepath.ToSlash(profile)
	command := exec.Command(
		binary,
		"--headless", "--nologo", "--nodefault", "--norestore",
		"-env:UserInstallation="+profileURL,
		"--convert-to", format,
		"--outdir", workspace,
		source,
	)
	command.Env = append(
		os.Environ(),
		"HOME="+workspace,
		"XDG_RUNTIME_DIR="+workspace,
		"XDG_CONFIG_HOME="+workspace,
		"XDG_CACHE_HOME="+workspace,
	)
	if output, err := command.CombinedOutput(); err != nil {
		t.Fatalf("create %s fixture: %s: %v", format, output, err)
	}
}

func assertFileMagic(t *testing.T, path string, magic []byte) {
	t.Helper()
	body, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	if len(body) < len(magic) || string(body[:len(magic)]) != string(magic) {
		t.Fatalf("%s has unexpected magic bytes", path)
	}
}

const flatPresentation = `<?xml version="1.0" encoding="UTF-8"?>
<office:document
 xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
 xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0"
 xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"
 xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0"
 xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0"
 xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0"
 office:mimetype="application/vnd.oasis.opendocument.presentation"
 office:version="1.3">
 <office:automatic-styles>
  <style:page-layout style:name="pm1">
   <style:page-layout-properties fo:page-width="10in" fo:page-height="7.5in"/>
  </style:page-layout>
  <style:style style:name="dp1" style:family="drawing-page"/>
 </office:automatic-styles>
 <office:master-styles>
  <style:master-page style:name="Default" style:page-layout-name="pm1" draw:style-name="dp1"/>
 </office:master-styles>
 <office:body>
  <office:presentation>
   <draw:page draw:name="Slide 1" draw:master-page-name="Default">
    <draw:frame svg:x="1in" svg:y="1in" svg:width="8in" svg:height="2in">
     <draw:text-box><text:p>Portfolio Activity</text:p></draw:text-box>
    </draw:frame>
   </draw:page>
  </office:presentation>
 </office:body>
</office:document>`

const flatSpreadsheet = `<?xml version="1.0" encoding="UTF-8"?>
<office:document
 xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
 xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0"
 xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"
 office:mimetype="application/vnd.oasis.opendocument.spreadsheet"
 office:version="1.3">
 <office:body>
  <office:spreadsheet>
   <table:table table:name="Activity">
    <table:table-row>
     <table:table-cell office:value-type="string">
      <text:p>Portfolio Activity</text:p>
     </table:table-cell>
    </table:table-row>
   </table:table>
  </office:spreadsheet>
 </office:body>
</office:document>`
