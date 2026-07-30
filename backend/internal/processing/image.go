package processing

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
)

const maxImagePixels int64 = 100_000_000

var ErrUnsupportedImage = errors.New("unsupported image")

type ImageProcessor struct {
	Binary string
}

type ImageResult struct {
	Format       string
	Width        int32
	Height       int32
	Frames       int
	Animated     bool
	DeliveryName string
	Variants     []ImageVariant
}

type ImageVariant struct {
	Name        string
	Path        string
	ContentType string
	Width       int32
	Height      int32
	ByteSize    int64
}

func (p ImageProcessor) Process(
	ctx context.Context,
	source string,
	outputDirectory string,
) (ImageResult, error) {
	if strings.TrimSpace(p.Binary) == "" {
		p.Binary = "magick"
	}
	if valid, err := validImageMagic(source); err != nil {
		return ImageResult{}, fmt.Errorf("read image signature: %w", err)
	} else if !valid {
		return ImageResult{}, ErrUnsupportedImage
	}
	format, width, height, frames, err := p.inspect(ctx, source)
	if err != nil {
		return ImageResult{}, err
	}
	if !supportedImageFormat(format) ||
		int64(width)*int64(height) > maxImagePixels {
		return ImageResult{}, ErrUnsupportedImage
	}
	if err := os.MkdirAll(outputDirectory, 0o700); err != nil {
		return ImageResult{}, fmt.Errorf("create image workspace: %w", err)
	}

	result := ImageResult{
		Format:   format,
		Width:    width,
		Height:   height,
		Frames:   frames,
		Animated: frames > 1,
	}
	master, err := p.renderWebP(
		ctx,
		source,
		outputDirectory,
		"master_webp",
		"",
		frames > 1,
	)
	if err != nil {
		return ImageResult{}, err
	}
	result.Variants = append(result.Variants, master)
	result.DeliveryName = master.Name

	for _, size := range []int{480, 960, 1600} {
		if int(width) <= size && int(height) <= size {
			continue
		}
		variant, err := p.renderWebP(
			ctx,
			source,
			outputDirectory,
			fmt.Sprintf("responsive_%d", size),
			fmt.Sprintf("%dx%d>", size, size),
			frames > 1,
		)
		if err != nil {
			return ImageResult{}, err
		}
		result.Variants = append(result.Variants, variant)
	}

	cover, err := p.renderCover(ctx, source, outputDirectory)
	if err != nil {
		return ImageResult{}, err
	}
	result.Variants = append(result.Variants, cover)

	if extension, mimeType, ok := browserImageFormat(format); ok {
		sanitized, err := p.renderSanitized(
			ctx,
			source,
			outputDirectory,
			extension,
			mimeType,
		)
		if err != nil {
			return ImageResult{}, err
		}
		result.Variants = append(result.Variants, sanitized)
		if sanitized.ByteSize < master.ByteSize {
			result.DeliveryName = sanitized.Name
		}
	}

	return result, nil
}

func validImageMagic(path string) (bool, error) {
	file, err := os.Open(path)
	if err != nil {
		return false, err
	}
	defer file.Close()
	header := make([]byte, 32)
	n, err := file.Read(header)
	if err != nil && n == 0 {
		return false, err
	}
	header = header[:n]
	switch {
	case len(header) >= 3 &&
		bytes.Equal(header[:3], []byte{0xff, 0xd8, 0xff}):
		return true, nil
	case len(header) >= 8 &&
		bytes.Equal(header[:8], []byte("\x89PNG\r\n\x1a\n")):
		return true, nil
	case len(header) >= 12 &&
		bytes.Equal(header[:4], []byte("RIFF")) &&
		bytes.Equal(header[8:12], []byte("WEBP")):
		return true, nil
	case len(header) >= 4 &&
		(bytes.Equal(header[:4], []byte{'I', 'I', 0x2a, 0x00}) ||
			bytes.Equal(header[:4], []byte{'M', 'M', 0x00, 0x2a})):
		return true, nil
	case len(header) >= 2 && bytes.Equal(header[:2], []byte("BM")):
		return true, nil
	case len(header) >= 6 &&
		(bytes.Equal(header[:6], []byte("GIF87a")) ||
			bytes.Equal(header[:6], []byte("GIF89a"))):
		return true, nil
	case len(header) >= 12 && bytes.Equal(header[4:8], []byte("ftyp")):
		brand := string(header[8:12])
		switch brand {
		case "avif", "avis", "heic", "heix", "hevc", "hevx", "mif1", "msf1":
			return true, nil
		}
	}
	return false, nil
}

func (p ImageProcessor) inspect(
	ctx context.Context,
	source string,
) (string, int32, int32, int, error) {
	output, err := p.run(
		ctx,
		"identify",
		"-quiet",
		"-format",
		"%m|%w|%h|%n\n",
		source,
	)
	if err != nil {
		return "", 0, 0, 0, ErrUnsupportedImage
	}
	firstLine := strings.SplitN(strings.TrimSpace(output), "\n", 2)[0]
	parts := strings.Split(firstLine, "|")
	if len(parts) != 4 {
		return "", 0, 0, 0, ErrUnsupportedImage
	}
	width, widthErr := strconv.ParseInt(parts[1], 10, 32)
	height, heightErr := strconv.ParseInt(parts[2], 10, 32)
	frames, framesErr := strconv.Atoi(parts[3])
	if widthErr != nil || heightErr != nil || framesErr != nil ||
		width <= 0 || height <= 0 || frames <= 0 {
		return "", 0, 0, 0, ErrUnsupportedImage
	}
	return strings.ToUpper(parts[0]), int32(width), int32(height), frames, nil
}

func (p ImageProcessor) renderWebP(
	ctx context.Context,
	source string,
	directory string,
	name string,
	resize string,
	animated bool,
) (ImageVariant, error) {
	target := filepath.Join(directory, name+".webp")
	args := []string{source}
	if animated {
		args = append(args, "-coalesce")
	}
	args = append(args, "-auto-orient", "-strip")
	if resize != "" {
		args = append(args, "-resize", resize)
	}
	args = append(
		args,
		"-define", "webp:lossless=true",
		"-define", "webp:method=6",
		"-quality", "100",
		"-loop", "0",
		"-adjoin",
		target,
	)
	if _, err := p.run(ctx, args...); err != nil {
		return ImageVariant{}, fmt.Errorf("render %s: %w", name, err)
	}
	return p.variantInfo(ctx, name, target, "image/webp")
}

func (p ImageProcessor) renderCover(
	ctx context.Context,
	source string,
	directory string,
) (ImageVariant, error) {
	const name = "cover_1600x900"
	target := filepath.Join(directory, name+".webp")
	if _, err := p.run(
		ctx,
		source,
		"-auto-orient",
		"-strip",
		"-resize", "1600x900^>",
		"-gravity", "center",
		"-extent", "1600x900",
		"-define", "webp:lossless=true",
		"-define", "webp:method=6",
		"-quality", "100",
		target,
	); err != nil {
		return ImageVariant{}, fmt.Errorf("render cover: %w", err)
	}
	return p.variantInfo(ctx, name, target, "image/webp")
}

func (p ImageProcessor) renderSanitized(
	ctx context.Context,
	source string,
	directory string,
	extension string,
	contentType string,
) (ImageVariant, error) {
	const name = "sanitized_original"
	target := filepath.Join(directory, name+"."+extension)
	if _, err := p.run(
		ctx,
		source,
		"-auto-orient",
		"-strip",
		target,
	); err != nil {
		return ImageVariant{}, fmt.Errorf("sanitize original: %w", err)
	}
	return p.variantInfo(ctx, name, target, contentType)
}

func (p ImageProcessor) variantInfo(
	ctx context.Context,
	name string,
	path string,
	contentType string,
) (ImageVariant, error) {
	info, err := os.Stat(path)
	if err != nil {
		return ImageVariant{}, fmt.Errorf("stat image variant: %w", err)
	}
	_, width, height, _, err := p.inspect(ctx, path)
	if err != nil {
		return ImageVariant{}, fmt.Errorf("inspect image variant: %w", err)
	}
	return ImageVariant{
		Name: name, Path: path, ContentType: contentType,
		Width: width, Height: height, ByteSize: info.Size(),
	}, nil
}

func (p ImageProcessor) run(
	ctx context.Context,
	args ...string,
) (string, error) {
	limits := []string{
		"-limit", "thread", "2",
		"-limit", "memory", "256MiB",
		"-limit", "map", "512MiB",
		"-limit", "disk", "2GiB",
		"-limit", "area", "100MP",
		"-limit", "time", "120",
	}
	commandArgs := append(limits, args...)
	if len(args) > 0 && args[0] == "identify" {
		commandArgs = append(
			[]string{"identify"},
			append(limits, args[1:]...)...,
		)
	}
	command := exec.CommandContext(ctx, p.Binary, commandArgs...)
	command.Env = append(os.Environ(), "MAGICK_TMPDIR="+os.TempDir())
	output, err := command.CombinedOutput()
	if err != nil {
		message := strings.TrimSpace(string(output))
		if len(message) > 500 {
			message = message[:500]
		}
		return "", fmt.Errorf("ImageMagick: %s: %w", message, err)
	}
	return string(output), nil
}

func supportedImageFormat(format string) bool {
	switch format {
	case "JPEG", "JPG", "PNG", "WEBP", "AVIF", "HEIC",
		"TIFF", "BMP", "GIF":
		return true
	default:
		return false
	}
}

func browserImageFormat(format string) (string, string, bool) {
	switch format {
	case "JPEG", "JPG":
		return "jpg", "image/jpeg", true
	case "PNG":
		return "png", "image/png", true
	case "WEBP":
		return "webp", "image/webp", true
	case "AVIF":
		return "avif", "image/avif", true
	case "GIF":
		return "gif", "image/gif", true
	default:
		return "", "", false
	}
}
