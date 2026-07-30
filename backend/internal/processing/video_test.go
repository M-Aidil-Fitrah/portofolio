package processing

import (
	"bytes"
	"context"
	"os"
	"os/exec"
	"path/filepath"
	"testing"
	"time"
)

func TestVideoProcessorRemuxesCompatibleMP4(t *testing.T) {
	t.Parallel()
	ffmpeg, ffprobe := videoBinaries(t)
	workspace := t.TempDir()
	source := filepath.Join(workspace, "source.mp4")
	runFixtureFFmpeg(
		t,
		ffmpeg,
		"-f", "lavfi", "-i", "color=c=#102030:s=320x180:r=30",
		"-f", "lavfi", "-i", "sine=frequency=440:sample_rate=48000",
		"-t", "1",
		"-c:v", "libx264", "-pix_fmt", "yuv420p",
		"-c:a", "aac", "-b:a", "128k",
		"-shortest", "-movflags", "+faststart",
		source,
	)
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	result, err := (VideoProcessor{
		FFmpeg: ffmpeg, FFprobe: ffprobe,
	}).Process(ctx, source, filepath.Join(workspace, "output"))
	if err != nil {
		t.Fatalf("Process() error = %v", err)
	}
	if !result.Remuxed ||
		result.VideoCodec != "h264" ||
		result.AudioCodec != "aac" ||
		result.Width != 320 ||
		result.Height != 180 ||
		result.FPS > 30.01 ||
		result.DurationMS < 900 ||
		result.DurationMS > 1100 {
		t.Fatalf("result = %#v", result)
	}
	body, err := os.ReadFile(result.VideoPath)
	if err != nil {
		t.Fatal(err)
	}
	moov, mdat := bytes.Index(body, []byte("moov")), bytes.Index(body, []byte("mdat"))
	if moov < 0 || mdat < 0 || moov > mdat {
		t.Fatalf("MP4 is not faststart: moov=%d mdat=%d", moov, mdat)
	}
	poster, err := os.ReadFile(result.PosterPath)
	if err != nil {
		t.Fatal(err)
	}
	if len(poster) < 12 ||
		string(poster[:4]) != "RIFF" ||
		string(poster[8:12]) != "WEBP" {
		t.Fatal("poster is not WebP")
	}
}

func TestVideoProcessorTranscodesUnsupportedCodec(t *testing.T) {
	t.Parallel()
	ffmpeg, ffprobe := videoBinaries(t)
	workspace := t.TempDir()
	source := filepath.Join(workspace, "source.avi")
	runFixtureFFmpeg(
		t,
		ffmpeg,
		"-f", "lavfi", "-i", "testsrc2=s=352x288:r=24",
		"-t", "1",
		"-c:v", "mpeg4", "-q:v", "8",
		source,
	)
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	result, err := (VideoProcessor{
		FFmpeg: ffmpeg, FFprobe: ffprobe,
	}).Process(ctx, source, filepath.Join(workspace, "output"))
	if err != nil {
		t.Fatalf("Process() error = %v", err)
	}
	if result.Remuxed ||
		result.VideoCodec != "h264" ||
		result.Width != 352 ||
		result.Height != 288 ||
		result.FPS > 60.01 {
		t.Fatalf("result = %#v", result)
	}
}

func TestVideoProbeRejectsExcessDuration(t *testing.T) {
	t.Parallel()
	probe := videoProbe{}
	probe.Format.Duration = "301"
	probe.Streams = []videoStream{{
		CodecType: "video", CodecName: "h264",
		PixelFormat: "yuv420p", Width: 320, Height: 180,
		FrameRate: "30/1",
	}}
	if _, _, _, _, err := validateVideoProbe(probe); err == nil {
		t.Fatal("validateVideoProbe() error = nil for 301-second video")
	}
}

func TestVideoProcessorCapsFrameRateAndResolution(t *testing.T) {
	t.Parallel()
	ffmpeg, ffprobe := videoBinaries(t)
	workspace := t.TempDir()
	source := filepath.Join(workspace, "oversized.avi")
	runFixtureFFmpeg(
		t,
		ffmpeg,
		"-f", "lavfi", "-i", "testsrc2=s=2000x1200:r=90",
		"-t", "0.2",
		"-c:v", "mpeg4", "-q:v", "20",
		source,
	)
	ctx, cancel := context.WithTimeout(context.Background(), 45*time.Second)
	defer cancel()
	result, err := (VideoProcessor{
		FFmpeg: ffmpeg, FFprobe: ffprobe,
	}).Process(ctx, source, filepath.Join(workspace, "output"))
	if err != nil {
		t.Fatalf("Process() error = %v", err)
	}
	if result.Width > 1920 ||
		result.Height > 1080 ||
		result.FPS > 60.01 {
		t.Fatalf("result = %#v", result)
	}
}

func videoBinaries(t *testing.T) (string, string) {
	t.Helper()
	ffmpeg, err := exec.LookPath("ffmpeg")
	if err != nil {
		t.Skip("ffmpeg is not installed")
	}
	ffprobe, err := exec.LookPath("ffprobe")
	if err != nil {
		t.Skip("ffprobe is not installed")
	}
	return ffmpeg, ffprobe
}

func runFixtureFFmpeg(
	t *testing.T,
	binary string,
	args ...string,
) {
	t.Helper()
	command := exec.Command(binary, append(
		[]string{"-hide_banner", "-loglevel", "error", "-y"},
		args...,
	)...)
	if output, err := command.CombinedOutput(); err != nil {
		t.Fatalf("create video fixture: %s: %v", output, err)
	}
}
