package processing

import (
	"context"
	"errors"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"testing"
	"time"
)

func TestImageProcessorCreatesFaithfulWebPAndStripsMetadata(t *testing.T) {
	t.Parallel()
	binary, err := exec.LookPath("magick")
	if err != nil {
		t.Skip("ImageMagick is not installed")
	}
	workspace := t.TempDir()
	source := filepath.Join(workspace, "source.png")
	command := exec.Command(
		binary,
		"-size", "64x32",
		"xc:#102030",
		"-fill", "#f0c040",
		"-draw", "rectangle 8,8 31,23",
		"-set", "comment", "sensitive metadata",
		source,
	)
	if output, err := command.CombinedOutput(); err != nil {
		t.Fatalf("create fixture: %s: %v", output, err)
	}
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	result, err := (ImageProcessor{Binary: binary}).Process(
		ctx,
		source,
		filepath.Join(workspace, "output"),
	)
	if err != nil {
		t.Fatalf("Process() error = %v", err)
	}
	if result.Format != "PNG" || result.Width != 64 || result.Height != 32 {
		t.Fatalf("result = %#v", result)
	}
	master := findVariant(t, result, "master_webp")
	if result.DeliveryName != master.Name {
		t.Fatalf("DeliveryName = %q, want %q", result.DeliveryName, master.Name)
	}
	// Encoding is lossy, so pixels are no longer identical. This bound is not a
	// quality bar — it catches the conversion being broken outright. A wrong
	// resize, an inverted colour space or the wrong file entirely lands well
	// above 0.1, while this hard-edged synthetic fixture is the worst case for
	// lossy encoding and still sits near 0.025.
	compare := exec.Command(
		binary,
		"compare",
		"-metric", "RMSE",
		source,
		master.Path,
		"null:",
	)
	output, _ := compare.CombinedOutput()
	normalized, err := normalizedRMSE(string(output))
	if err != nil {
		t.Fatalf("compare output = %q: %v", output, err)
	}
	if normalized > 0.05 {
		t.Fatalf("normalized RMSE = %f, want <= 0.05", normalized)
	}
	metadata := exec.Command(
		binary,
		"identify",
		"-format", "%c",
		master.Path,
	)
	output, err = metadata.CombinedOutput()
	if err != nil {
		t.Fatalf("inspect metadata: %s: %v", output, err)
	}
	if strings.TrimSpace(string(output)) != "" {
		t.Fatalf("master comment metadata = %q", output)
	}
}

// normalizedRMSE reads the parenthesised 0..1 value from `compare -metric RMSE`,
// whose output looks like "1234.5 (0.018834)".
func normalizedRMSE(output string) (float64, error) {
	text := strings.TrimSpace(output)
	open := strings.LastIndex(text, "(")
	closing := strings.LastIndex(text, ")")
	if open < 0 || closing < open {
		return 0, errors.New("no normalized value in compare output")
	}
	return strconv.ParseFloat(text[open+1:closing], 64)
}

// Photographs arrive as JPEG, and a JPEG re-encode is often smaller than the
// WebP. Delivery must stay WebP anyway: the public site is meant to serve one
// format, and picking per-asset by byte size made the served type unpredictable.
func TestImageProcessorAlwaysDeliversWebP(t *testing.T) {
	t.Parallel()
	binary, err := exec.LookPath("magick")
	if err != nil {
		t.Skip("ImageMagick is not installed")
	}
	workspace := t.TempDir()
	source := filepath.Join(workspace, "photo.jpg")
	command := exec.Command(
		binary,
		"-size", "256x256",
		"plasma:fractal",
		"-quality", "55",
		source,
	)
	if output, err := command.CombinedOutput(); err != nil {
		t.Fatalf("create fixture: %s: %v", output, err)
	}
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	result, err := (ImageProcessor{Binary: binary}).Process(
		ctx,
		source,
		filepath.Join(workspace, "output"),
	)
	if err != nil {
		t.Fatalf("Process() error = %v", err)
	}
	if result.DeliveryName != "master_webp" {
		t.Fatalf("DeliveryName = %q, want master_webp", result.DeliveryName)
	}
	for _, variant := range result.Variants {
		if variant.ContentType != "image/webp" {
			t.Fatalf(
				"variant %q content type = %q, want image/webp",
				variant.Name,
				variant.ContentType,
			)
		}
	}
}

func TestImageProcessorRejectsNonRasterMagic(t *testing.T) {
	t.Parallel()
	source := filepath.Join(t.TempDir(), "spoofed.png")
	if err := os.WriteFile(
		source,
		[]byte(`<svg xmlns="http://www.w3.org/2000/svg"/>`),
		0o600,
	); err != nil {
		t.Fatal(err)
	}
	_, err := (ImageProcessor{Binary: "magick"}).Process(
		context.Background(),
		source,
		t.TempDir(),
	)
	if !errors.Is(err, ErrUnsupportedImage) {
		t.Fatalf("Process() error = %v, want ErrUnsupportedImage", err)
	}
}

func TestImageProcessorPreservesAnimation(t *testing.T) {
	t.Parallel()
	binary, err := exec.LookPath("magick")
	if err != nil {
		t.Skip("ImageMagick is not installed")
	}
	workspace := t.TempDir()
	source := filepath.Join(workspace, "animated.gif")
	command := exec.Command(
		binary,
		"-size", "16x16", "xc:red",
		"-size", "16x16", "xc:blue",
		"-delay", "10",
		"-loop", "0",
		source,
	)
	if output, err := command.CombinedOutput(); err != nil {
		t.Fatalf("create animated fixture: %s: %v", output, err)
	}
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	result, err := (ImageProcessor{Binary: binary}).Process(
		ctx,
		source,
		filepath.Join(workspace, "output"),
	)
	if err != nil {
		t.Fatalf("Process() error = %v", err)
	}
	if !result.Animated || result.Frames != 2 {
		t.Fatalf("animation result = %#v", result)
	}
	master := findVariant(t, result, "master_webp")
	output, err := exec.Command(
		binary,
		"identify",
		"-format", "%n\n",
		master.Path,
	).CombinedOutput()
	firstLine := strings.SplitN(strings.TrimSpace(string(output)), "\n", 2)[0]
	if err != nil || firstLine != "2" {
		t.Fatalf("master frames = %q, error = %v", output, err)
	}
}

func findVariant(
	t *testing.T,
	result ImageResult,
	name string,
) ImageVariant {
	t.Helper()
	for _, variant := range result.Variants {
		if variant.Name == name {
			return variant
		}
	}
	t.Fatalf("variant %q not found in %#v", name, result.Variants)
	return ImageVariant{}
}
