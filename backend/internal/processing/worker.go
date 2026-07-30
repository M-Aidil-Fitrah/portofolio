package processing

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/M-Aidil-Fitrah/portofolio/backend/internal/database/dbgen"
	"github.com/M-Aidil-Fitrah/portofolio/backend/internal/storage"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Worker struct {
	pool              *pgxpool.Pool
	queries           *dbgen.Queries
	store             storage.ObjectStore
	images            ImageProcessor
	videos            VideoProcessor
	id                string
	logger            *slog.Logger
	pollInterval      time.Duration
	jobTimeout        time.Duration
	heartbeatInterval time.Duration
	now               func() time.Time
}

type WorkerOptions struct {
	ID                string
	Logger            *slog.Logger
	PollInterval      time.Duration
	JobTimeout        time.Duration
	HeartbeatInterval time.Duration
	ImageBinary       string
	FFmpegBinary      string
	FFprobeBinary     string
}

func NewWorker(
	pool *pgxpool.Pool,
	store storage.ObjectStore,
	options WorkerOptions,
) *Worker {
	if strings.TrimSpace(options.ID) == "" {
		options.ID = "worker-" + uuid.NewString()
	}
	if options.Logger == nil {
		options.Logger = slog.Default()
	}
	if options.PollInterval <= 0 {
		options.PollInterval = 2 * time.Second
	}
	if options.JobTimeout <= 0 {
		options.JobTimeout = 15 * time.Minute
	}
	if options.HeartbeatInterval <= 0 {
		options.HeartbeatInterval = 15 * time.Second
	}
	return &Worker{
		pool: pool, queries: dbgen.New(pool), store: store,
		images: ImageProcessor{Binary: options.ImageBinary},
		videos: VideoProcessor{
			FFmpeg: options.FFmpegBinary, FFprobe: options.FFprobeBinary,
		},
		id: options.ID, logger: options.Logger,
		pollInterval:      options.PollInterval,
		jobTimeout:        options.JobTimeout,
		heartbeatInterval: options.HeartbeatInterval,
		now:               time.Now,
	}
}

func (w *Worker) Run(ctx context.Context) error {
	w.logger.Info("media worker started", "worker_id", w.id)
	for {
		processed, err := w.ProcessOne(ctx)
		if err != nil {
			w.logger.Error("process media job", "error", err)
		}
		if processed {
			continue
		}
		timer := time.NewTimer(w.pollInterval)
		select {
		case <-ctx.Done():
			timer.Stop()
			w.logger.Info("media worker stopped", "worker_id", w.id)
			return nil
		case <-timer.C:
		}
	}
}

func (w *Worker) ProcessOne(ctx context.Context) (bool, error) {
	staleBefore := pgtype.Timestamptz{
		Time: w.now().UTC().Add(-2 * w.jobTimeout), Valid: true,
	}
	if err := w.queries.FailStaleProcessingJobs(
		ctx,
		staleBefore,
	); err != nil {
		return false, fmt.Errorf("fail stale image jobs: %w", err)
	}
	if err := w.queries.RetryStaleProcessingJobs(
		ctx,
		staleBefore,
	); err != nil {
		return false, fmt.Errorf("retry stale image jobs: %w", err)
	}

	workerID := w.id
	job, err := w.queries.ClaimImageProcessingJob(ctx, &workerID)
	if errors.Is(err, pgx.ErrNoRows) {
		job, err = w.queries.ClaimVideoProcessingJob(ctx, &workerID)
	}
	if errors.Is(err, pgx.ErrNoRows) {
		return false, nil
	}
	if err != nil {
		return false, fmt.Errorf("claim media job: %w", err)
	}
	jobCtx, cancel := context.WithTimeout(ctx, w.jobTimeout)
	defer cancel()
	stopHeartbeat := w.heartbeat(jobCtx, job.ID)
	switch job.JobType {
	case dbgen.ProcessingJobTypeImage:
		err = w.processImage(jobCtx, job)
	case dbgen.ProcessingJobTypeVideo:
		err = w.processVideo(jobCtx, job)
	default:
		err = fmt.Errorf("unsupported processing job type %s", job.JobType)
	}
	stopHeartbeat()
	if err == nil {
		return true, nil
	}
	if failureErr := w.handleFailure(ctx, job, err); failureErr != nil {
		return true, errors.Join(err, failureErr)
	}
	return true, nil
}

func (w *Worker) processVideo(
	ctx context.Context,
	job dbgen.ProcessingJob,
) error {
	asset, err := w.queries.GetMediaAsset(ctx, job.AssetID)
	if err != nil {
		return fmt.Errorf("get video asset: %w", err)
	}
	if asset.Kind != dbgen.MediaKindVideo {
		return fmt.Errorf("%w: queued asset kind is %s", ErrUnsupportedVideo, asset.Kind)
	}
	if changed, err := w.queries.StartMediaAssetProcessing(
		ctx,
		job.AssetID,
	); err != nil {
		return fmt.Errorf("start video asset: %w", err)
	} else if changed == 0 {
		return fmt.Errorf("video asset cannot enter processing")
	}

	workspace, err := os.MkdirTemp("", "portfolio-video-*")
	if err != nil {
		return fmt.Errorf("create video workspace: %w", err)
	}
	defer os.RemoveAll(workspace)
	source := filepath.Join(workspace, "original")
	if err := w.store.Download(
		ctx,
		asset.OriginalObjectKey,
		source,
	); err != nil {
		return err
	}
	result, err := w.videos.Process(
		ctx,
		source,
		filepath.Join(workspace, "output"),
	)
	if err != nil {
		return err
	}

	assetID := uuid.UUID(job.AssetID.Bytes).String()
	videoKey := fmt.Sprintf(
		"processed/videos/%s/delivery.mp4",
		assetID,
	)
	videoInfo, err := w.store.Upload(
		ctx,
		videoKey,
		result.VideoPath,
		"video/mp4",
	)
	if err != nil {
		return err
	}
	posterKey := fmt.Sprintf(
		"processed/videos/%s/poster.webp",
		assetID,
	)
	posterInfo, err := w.store.Upload(
		ctx,
		posterKey,
		result.PosterPath,
		"image/webp",
	)
	if err != nil {
		return err
	}

	tx, err := w.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin video completion: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()
	qtx := w.queries.WithTx(tx)
	videoMetadata, _ := json.Marshal(map[string]any{
		"codec": result.VideoCodec, "audio_codec": result.AudioCodec,
		"fps": result.FPS, "remuxed": result.Remuxed,
	})
	videoWidth, videoHeight := result.Width, result.Height
	if _, err := qtx.UpsertAssetVariant(
		ctx,
		dbgen.UpsertAssetVariantParams{
			AssetID: job.AssetID, VariantKey: "delivery_mp4",
			ObjectKey: videoKey, MimeType: "video/mp4",
			ByteSize: videoInfo.Size,
			Width:    &videoWidth, Height: &videoHeight,
			Metadata: videoMetadata,
		},
	); err != nil {
		return fmt.Errorf("save video variant: %w", err)
	}
	posterMetadata, _ := json.Marshal(map[string]any{"lossless": true})
	posterWidth, posterHeight := result.PosterWidth, result.PosterHeight
	if _, err := qtx.UpsertAssetVariant(
		ctx,
		dbgen.UpsertAssetVariantParams{
			AssetID: job.AssetID, VariantKey: "poster_webp",
			ObjectKey: posterKey, MimeType: "image/webp",
			ByteSize: posterInfo.Size,
			Width:    &posterWidth, Height: &posterHeight,
			Metadata: posterMetadata,
		},
	); err != nil {
		return fmt.Errorf("save video poster: %w", err)
	}
	if _, err := qtx.MarkVideoAssetReady(
		ctx,
		dbgen.MarkVideoAssetReadyParams{
			DeliveryObjectKey: &videoKey,
			ByteSize:          videoInfo.Size,
			Width:             &videoWidth, Height: &videoHeight,
			DurationMs: &result.DurationMS,
			Metadata:   videoMetadata,
			AssetID:    job.AssetID,
		},
	); err != nil {
		return fmt.Errorf("mark video ready: %w", err)
	}
	workerID := w.id
	if changed, err := qtx.CompleteProcessingJob(
		ctx,
		dbgen.CompleteProcessingJobParams{
			JobID: job.ID, WorkerID: &workerID,
		},
	); err != nil {
		return fmt.Errorf("complete video job: %w", err)
	} else if changed == 0 {
		return fmt.Errorf("video job lock was lost")
	}
	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit video completion: %w", err)
	}
	return nil
}

func (w *Worker) processImage(
	ctx context.Context,
	job dbgen.ProcessingJob,
) error {
	asset, err := w.queries.GetMediaAsset(ctx, job.AssetID)
	if err != nil {
		return fmt.Errorf("get image asset: %w", err)
	}
	if asset.Kind != dbgen.MediaKindImage {
		return fmt.Errorf("%w: queued asset kind is %s", ErrUnsupportedImage, asset.Kind)
	}
	if changed, err := w.queries.StartMediaAssetProcessing(
		ctx,
		job.AssetID,
	); err != nil {
		return fmt.Errorf("start image asset: %w", err)
	} else if changed == 0 {
		return fmt.Errorf("image asset cannot enter processing")
	}

	workspace, err := os.MkdirTemp("", "portfolio-image-*")
	if err != nil {
		return fmt.Errorf("create image workspace: %w", err)
	}
	defer os.RemoveAll(workspace)
	source := filepath.Join(workspace, "original")
	if err := w.store.Download(
		ctx,
		asset.OriginalObjectKey,
		source,
	); err != nil {
		return err
	}
	result, err := w.images.Process(
		ctx,
		source,
		filepath.Join(workspace, "output"),
	)
	if err != nil {
		return err
	}

	type uploadedVariant struct {
		ImageVariant
		ObjectKey string
		ByteSize  int64
	}
	uploaded := make([]uploadedVariant, 0, len(result.Variants))
	var delivery uploadedVariant
	assetID := uuid.UUID(job.AssetID.Bytes).String()
	for _, variant := range result.Variants {
		objectKey := fmt.Sprintf(
			"processed/images/%s/%s%s",
			assetID,
			variant.Name,
			filepath.Ext(variant.Path),
		)
		info, err := w.store.Upload(
			ctx,
			objectKey,
			variant.Path,
			variant.ContentType,
		)
		if err != nil {
			return err
		}
		value := uploadedVariant{
			ImageVariant: variant,
			ObjectKey:    objectKey,
			ByteSize:     info.Size,
		}
		uploaded = append(uploaded, value)
		if variant.Name == result.DeliveryName {
			delivery = value
		}
	}
	if delivery.ObjectKey == "" {
		return fmt.Errorf("image delivery variant was not produced")
	}

	tx, err := w.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin image completion: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()
	qtx := w.queries.WithTx(tx)
	for _, variant := range uploaded {
		width, height := variant.Width, variant.Height
		variantMetadata, _ := json.Marshal(map[string]any{
			"lossless": variant.Name != "sanitized_original",
			"animated": result.Animated,
			"frames":   result.Frames,
		})
		if _, err := qtx.UpsertAssetVariant(
			ctx,
			dbgen.UpsertAssetVariantParams{
				AssetID: job.AssetID, VariantKey: variant.Name,
				ObjectKey: variant.ObjectKey,
				MimeType:  variant.ContentType,
				ByteSize:  variant.ByteSize,
				Width:     &width, Height: &height,
				Metadata: variantMetadata,
			},
		); err != nil {
			return fmt.Errorf("save image variant: %w", err)
		}
	}
	imageMetadata, _ := json.Marshal(map[string]any{
		"source_format": result.Format,
		"animated":      result.Animated,
		"frames":        result.Frames,
		"delivery":      result.DeliveryName,
	})
	width, height := delivery.Width, delivery.Height
	if _, err := qtx.MarkImageAssetReady(
		ctx,
		dbgen.MarkImageAssetReadyParams{
			DeliveryObjectKey: &delivery.ObjectKey,
			MimeType:          delivery.ContentType,
			ByteSize:          delivery.ByteSize,
			Width:             &width,
			Height:            &height,
			Metadata:          imageMetadata,
			AssetID:           job.AssetID,
		},
	); err != nil {
		return fmt.Errorf("mark image ready: %w", err)
	}
	workerID := w.id
	if changed, err := qtx.CompleteProcessingJob(
		ctx,
		dbgen.CompleteProcessingJobParams{
			JobID: job.ID, WorkerID: &workerID,
		},
	); err != nil {
		return fmt.Errorf("complete image job: %w", err)
	} else if changed == 0 {
		return fmt.Errorf("image job lock was lost")
	}
	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit image completion: %w", err)
	}
	return nil
}

func (w *Worker) handleFailure(
	ctx context.Context,
	job dbgen.ProcessingJob,
	cause error,
) error {
	message := cause.Error()
	if len(message) > 1000 {
		message = message[:1000]
	}
	workerID := w.id
	if job.Attempts < job.MaxAttempts {
		delay := time.Duration(job.Attempts*job.Attempts) * time.Second
		changed, err := w.queries.RetryProcessingJob(
			ctx,
			dbgen.RetryProcessingJobParams{
				RunAfter: pgtype.Timestamptz{
					Time: w.now().UTC().Add(delay), Valid: true,
				},
				LastError: &message,
				JobID:     job.ID, WorkerID: &workerID,
			},
		)
		if err != nil {
			return fmt.Errorf("retry media job: %w", err)
		}
		if changed == 0 {
			return fmt.Errorf("media job lock was lost during retry")
		}
		return nil
	}

	code := string(job.JobType) + "_processing_failed"
	switch {
	case errors.Is(cause, ErrUnsupportedImage):
		code = "unsupported_image"
	case errors.Is(cause, ErrUnsupportedVideo):
		code = "unsupported_video"
	}
	tx, err := w.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin media failure: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()
	qtx := w.queries.WithTx(tx)
	if err := qtx.MarkMediaAssetFailed(
		ctx,
		dbgen.MarkMediaAssetFailedParams{
			ErrorCode: &code, ErrorMessage: &message, AssetID: job.AssetID,
		},
	); err != nil {
		return fmt.Errorf("mark media failed: %w", err)
	}
	if changed, err := qtx.FailProcessingJob(
		ctx,
		dbgen.FailProcessingJobParams{
			LastError: &message,
			JobID:     job.ID, WorkerID: &workerID,
		},
	); err != nil {
		return fmt.Errorf("fail media job: %w", err)
	} else if changed == 0 {
		return fmt.Errorf("media job lock was lost during failure")
	}
	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit media failure: %w", err)
	}
	return nil
}

func (w *Worker) heartbeat(
	ctx context.Context,
	jobID pgtype.UUID,
) func() {
	heartbeatCtx, cancel := context.WithCancel(ctx)
	done := make(chan struct{})
	go func() {
		defer close(done)
		ticker := time.NewTicker(w.heartbeatInterval)
		defer ticker.Stop()
		for {
			select {
			case <-heartbeatCtx.Done():
				return
			case <-ticker.C:
				workerID := w.id
				if _, err := w.queries.HeartbeatProcessingJob(
					heartbeatCtx,
					dbgen.HeartbeatProcessingJobParams{
						JobID: jobID, WorkerID: &workerID,
					},
				); err != nil && heartbeatCtx.Err() == nil {
					w.logger.Warn("heartbeat media job", "error", err)
				}
			}
		}
	}()
	return func() {
		cancel()
		<-done
	}
}
