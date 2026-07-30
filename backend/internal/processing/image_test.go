package processing

import (
	"context"
	"errors"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func TestImageProcessorCreatesPixelLosslessWebP(t *testing.T) {
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
	compare := exec.Command(
		binary,
		"compare",
		"-metric", "AE",
		source,
		master.Path,
		"null:",
	)
	output, compareErr := compare.CombinedOutput()
	if compareErr != nil ||
		!strings.HasPrefix(strings.TrimSpace(string(output)), "0") {
		t.Fatalf("pixel difference = %q, error = %v", output, compareErr)
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

func TestImageProcessorUsesSmallerSanitizedBrowserOriginal(t *testing.T) {
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
	master := findVariant(t, result, "master_webp")
	sanitized := findVariant(t, result, "sanitized_original")
	if sanitized.ByteSize >= master.ByteSize {
		t.Skip("fixture did not produce a smaller sanitized JPEG")
	}
	if result.DeliveryName != "sanitized_original" {
		t.Fatalf("DeliveryName = %q", result.DeliveryName)
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
