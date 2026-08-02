package processing

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
)

const maxVideoDuration = 5 * 60

var ErrUnsupportedVideo = errors.New("unsupported video")

type VideoProcessor struct {
	FFmpeg  string
	FFprobe string
}

type VideoResult struct {
	VideoPath    string
	PosterPath   string
	Width        int32
	Height       int32
	PosterWidth  int32
	PosterHeight int32
	DurationMS   int64
	FPS          float64
	VideoCodec   string
	AudioCodec   string
	Remuxed      bool
}

type videoProbe struct {
	Format struct {
		FormatName string `json:"format_name"`
		Duration   string `json:"duration"`
	} `json:"format"`
	Streams []videoStream `json:"streams"`
}

type videoStream struct {
	CodecType   string `json:"codec_type"`
	CodecName   string `json:"codec_name"`
	PixelFormat string `json:"pix_fmt"`
	Width       int32  `json:"width"`
	Height      int32  `json:"height"`
	FrameRate   string `json:"r_frame_rate"`
	Duration    string `json:"duration"`
}

func (p VideoProcessor) Process(
	ctx context.Context,
	source string,
	outputDirectory string,
) (VideoResult, error) {
	if strings.TrimSpace(p.FFmpeg) == "" {
		p.FFmpeg = "ffmpeg"
	}
	if strings.TrimSpace(p.FFprobe) == "" {
		p.FFprobe = "ffprobe"
	}
	info, err := os.Stat(source)
	if err != nil {
		return VideoResult{}, fmt.Errorf("stat video: %w", err)
	}
	if info.Size() <= 0 || info.Size() > storageVideoLimit {
		return VideoResult{}, ErrUnsupportedVideo
	}
	probe, err := p.probe(ctx, source)
	if err != nil {
		return VideoResult{}, err
	}
	video, audioCodec, duration, fps, err := validateVideoProbe(probe)
	if err != nil {
		return VideoResult{}, err
	}
	if err := os.MkdirAll(outputDirectory, 0o700); err != nil {
		return VideoResult{}, fmt.Errorf("create video workspace: %w", err)
	}

	videoPath := filepath.Join(outputDirectory, "delivery.mp4")
	remux := compatibleMP4(probe.Format.FormatName, video, audioCodec, fps)
	if remux {
		err = p.runFFmpeg(
			ctx,
			"-i", source,
			"-map", "0:v:0",
			"-map", "0:a:0?",
			"-c", "copy",
			"-map_metadata", "-1",
			"-map_chapters", "-1",
			"-movflags", "+faststart",
			videoPath,
		)
	} else {
		filter := "scale=w='min(1920,iw)':h='min(1080,ih)':" +
			"force_original_aspect_ratio=decrease:force_divisible_by=2"
		if fps > 60 {
			filter += ",fps=60"
		}
		err = p.runFFmpeg(
			ctx,
			"-i", source,
			"-map", "0:v:0",
			"-map", "0:a:0?",
			"-vf", filter,
			"-c:v", "libx264",
			"-preset", "medium",
			"-crf", "21",
			"-pix_fmt", "yuv420p",
			"-c:a", "aac",
			"-b:a", "128k",
			"-map_metadata", "-1",
			"-map_chapters", "-1",
			"-movflags", "+faststart",
			videoPath,
		)
	}
	if err != nil {
		return VideoResult{}, fmt.Errorf("encode delivery video: %w", err)
	}
	outputProbe, err := p.probe(ctx, videoPath)
	if err != nil {
		return VideoResult{}, fmt.Errorf("probe delivery video: %w", err)
	}
	outputVideo, outputAudio, outputDuration, outputFPS, err :=
		validateVideoProbe(outputProbe)
	if err != nil {
		return VideoResult{}, err
	}
	if outputVideo.CodecName != "h264" ||
		outputVideo.PixelFormat != "yuv420p" ||
		(outputAudio != "" && outputAudio != "aac") ||
		outputFPS > 60.01 ||
		!within1080p(outputVideo.Width, outputVideo.Height) {
		return VideoResult{}, fmt.Errorf(
			"%w: delivery video is not browser-compatible",
			ErrUnsupportedVideo,
		)
	}

	posterPath := filepath.Join(outputDirectory, "poster.webp")
	posterAt := math.Min(duration*0.1, 3)
	if err := p.runFFmpeg(
		ctx,
		"-ss", strconv.FormatFloat(posterAt, 'f', 3, 64),
		"-i", source,
		"-frames:v", "1",
		"-vf", "scale=w='min(1600,iw)':h=-2",
		"-an",
		"-c:v", "libwebp",
		"-lossless", "1",
		"-compression_level", "6",
		posterPath,
	); err != nil {
		return VideoResult{}, fmt.Errorf("create video poster: %w", err)
	}
	posterProbe, err := p.probe(ctx, posterPath)
	if err != nil {
		return VideoResult{}, fmt.Errorf("probe video poster: %w", err)
	}
	poster, _, _, _, err := validateVisualProbe(posterProbe)
	if err != nil {
		return VideoResult{}, err
	}
	return VideoResult{
		VideoPath: videoPath, PosterPath: posterPath,
		Width: outputVideo.Width, Height: outputVideo.Height,
		PosterWidth: poster.Width, PosterHeight: poster.Height,
		DurationMS: int64(math.Round(outputDuration * 1000)),
		FPS:        outputFPS, VideoCodec: outputVideo.CodecName,
		AudioCodec: outputAudio, Remuxed: remux,
	}, nil
}

func (p VideoProcessor) probe(
	ctx context.Context,
	path string,
) (videoProbe, error) {
	command := exec.CommandContext(
		ctx,
		p.FFprobe,
		"-v", "error",
		"-protocol_whitelist", "file,pipe",
		"-probesize", "10M",
		"-analyzeduration", "10M",
		"-show_entries",
		"format=format_name,duration:"+
			"stream=codec_type,codec_name,pix_fmt,width,height,r_frame_rate,duration",
		"-of", "json",
		path,
	)
	output, err := command.CombinedOutput()
	if err != nil {
		return videoProbe{}, fmt.Errorf(
			"%w: ffprobe: %s",
			ErrUnsupportedVideo,
			limitedOutput(output),
		)
	}
	var value videoProbe
	if err := json.Unmarshal(output, &value); err != nil {
		return videoProbe{}, fmt.Errorf("%w: invalid ffprobe output", ErrUnsupportedVideo)
	}
	return value, nil
}

func (p VideoProcessor) runFFmpeg(
	ctx context.Context,
	args ...string,
) error {
	base := []string{
		"-hide_banner", "-loglevel", "error", "-nostdin", "-y",
		"-protocol_whitelist", "file,pipe",
		"-threads", "2",
	}
	command := exec.CommandContext(ctx, p.FFmpeg, append(base, args...)...)
	output, err := command.CombinedOutput()
	if err != nil {
		return fmt.Errorf("ffmpeg: %s: %w", limitedOutput(output), err)
	}
	return nil
}

func validateVideoProbe(
	probe videoProbe,
) (videoStream, string, float64, float64, error) {
	video, audio, duration, fps, err := validateVisualProbe(probe)
	if err != nil {
		return video, audio, duration, fps, err
	}
	if duration <= 0 || duration > maxVideoDuration {
		return video, audio, duration, fps, fmt.Errorf(
			"%w: duration must be at most five minutes",
			ErrUnsupportedVideo,
		)
	}
	return video, audio, duration, fps, nil
}

func validateVisualProbe(
	probe videoProbe,
) (videoStream, string, float64, float64, error) {
	var video videoStream
	audioCodec := ""
	for _, stream := range probe.Streams {
		switch stream.CodecType {
		case "video":
			if video.CodecType == "" {
				video = stream
			}
		case "audio":
			if audioCodec == "" {
				audioCodec = stream.CodecName
			}
		}
	}
	if video.CodecType == "" || video.Width <= 0 || video.Height <= 0 {
		return video, audioCodec, 0, 0, ErrUnsupportedVideo
	}
	duration, err := strconv.ParseFloat(probe.Format.Duration, 64)
	if err != nil || duration <= 0 {
		duration, err = strconv.ParseFloat(video.Duration, 64)
	}
	if err != nil {
		duration = 0
	}
	fps, err := parseFrameRate(video.FrameRate)
	if err != nil || fps <= 0 {
		return video, audioCodec, duration, 0, ErrUnsupportedVideo
	}
	return video, audioCodec, duration, fps, nil
}

func parseFrameRate(value string) (float64, error) {
	parts := strings.Split(value, "/")
	if len(parts) == 1 {
		return strconv.ParseFloat(value, 64)
	}
	if len(parts) != 2 {
		return 0, ErrUnsupportedVideo
	}
	numerator, err := strconv.ParseFloat(parts[0], 64)
	if err != nil {
		return 0, err
	}
	denominator, err := strconv.ParseFloat(parts[1], 64)
	if err != nil || denominator == 0 {
		return 0, ErrUnsupportedVideo
	}
	return numerator / denominator, nil
}

func compatibleMP4(
	format string,
	video videoStream,
	audioCodec string,
	fps float64,
) bool {
	return strings.Contains(format, "mp4") &&
		video.CodecName == "h264" &&
		video.PixelFormat == "yuv420p" &&
		(audioCodec == "" || audioCodec == "aac") &&
		fps <= 60.01 &&
		within1080p(video.Width, video.Height)
}

func within1080p(width, height int32) bool {
	return width <= 1920 && height <= 1080
}

func limitedOutput(value []byte) string {
	result := strings.TrimSpace(string(value))
	if len(result) > 1000 {
		result = result[:1000]
	}
	return result
}

const storageVideoLimit int64 = 250 << 20
