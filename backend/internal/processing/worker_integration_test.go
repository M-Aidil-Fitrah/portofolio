package processing

import (
	"context"
	"io"
	"net/url"
	"os"
	"os/exec"
	"path/filepath"
	"testing"
	"time"

	"github.com/M-Aidil-Fitrah/portofolio/backend/internal/database/dbgen"
	"github.com/M-Aidil-Fitrah/portofolio/backend/internal/storage"
	"github.com/M-Aidil-Fitrah/portofolio/backend/internal/testsupport"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
)

func TestImageWorkerCompletesJobIdempotently(t *testing.T) {
	databaseURL := testsupport.DatabaseURL(t)
	binary, err := exec.LookPath("magick")
	if err != nil {
		t.Skip("ImageMagick is not installed")
	}
	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()
	pool, err := pgxpool.New(ctx, databaseURL)
	if err != nil {
		t.Fatalf("pgxpool.New() error = %v", err)
	}
	defer pool.Close()

	workspace := t.TempDir()
	source := filepath.Join(workspace, "source.png")
	if output, err := exec.Command(
		binary,
		// Wide enough that the responsive ladder actually kicks in; a small
		// fixture would only ever produce the master and cover.
		"-size", "1200x600",
		"gradient:#102030-#f0c040",
		source,
	).CombinedOutput(); err != nil {
		t.Fatalf("create fixture: %s: %v", output, err)
	}
	store := &filesystemObjectStore{
		original: source,
		output:   filepath.Join(workspace, "objects"),
	}
	queries := dbgen.New(pool)
	assetUUID := uuid.New()
	assetID := pgtype.UUID{Bytes: assetUUID, Valid: true}
	if _, err := queries.CreateMediaAsset(
		ctx,
		dbgen.CreateMediaAssetParams{
			AssetID: assetID, Kind: dbgen.MediaKindImage,
			OriginalFilename:  "source.png",
			OriginalObjectKey: "originals/image/source/" + assetUUID.String(),
			MimeType:          "image/png", ByteSize: 1024,
			Metadata: []byte(`{}`),
		},
	); err != nil {
		t.Fatalf("CreateMediaAsset() error = %v", err)
	}
	if _, err := queries.CompleteMediaAssetUpload(
		ctx,
		dbgen.CompleteMediaAssetUploadParams{
			AssetID: assetID, ByteSize: 1024,
			MimeType: "image/png", Metadata: []byte(`{}`),
		},
	); err != nil {
		t.Fatalf("CompleteMediaAssetUpload() error = %v", err)
	}
	if err := queries.CreateProcessingJob(
		ctx,
		dbgen.CreateProcessingJobParams{
			AssetID: assetID, JobType: dbgen.ProcessingJobTypeImage,
			IdempotencyKey: "image-test:" + assetUUID.String(),
		},
	); err != nil {
		t.Fatalf("CreateProcessingJob() error = %v", err)
	}

	worker := NewWorker(pool, store, WorkerOptions{
		ID: "image-test-worker", ImageBinary: binary,
		HeartbeatInterval: 10 * time.Millisecond,
		JobTimeout:        30 * time.Second,
	})
	processed, err := worker.ProcessOne(ctx)
	if err != nil {
		t.Fatalf("ProcessOne() error = %v", err)
	}
	if !processed {
		t.Fatal("ProcessOne() processed = false")
	}
	asset, err := queries.GetMediaAsset(ctx, assetID)
	if err != nil {
		t.Fatalf("GetMediaAsset() error = %v", err)
	}
	if asset.Status != dbgen.AssetStatusReady ||
		asset.DeliveryObjectKey == nil {
		t.Fatalf("asset = %#v", asset)
	}
	var variants, completedJobs int
	if err := pool.QueryRow(
		ctx,
		"SELECT COUNT(*) FROM asset_variants WHERE asset_id = $1",
		assetID,
	).Scan(&variants); err != nil {
		t.Fatal(err)
	}
	if err := pool.QueryRow(
		ctx,
		"SELECT COUNT(*) FROM processing_jobs WHERE asset_id = $1 AND status = 'completed'",
		assetID,
	).Scan(&completedJobs); err != nil {
		t.Fatal(err)
	}
	// master_webp, responsive_480, responsive_960, cover_1600x900 — the 1600
	// step is skipped because the source is smaller than it.
	if variants != 4 || completedJobs != 1 {
		t.Fatalf("variants = %d, completed jobs = %d", variants, completedJobs)
	}
	processed, err = worker.ProcessOne(ctx)
	if err != nil || processed {
		t.Fatalf("second ProcessOne() = %v, %v", processed, err)
	}
}

func TestImageWorkerRetriesThenFailsUnsupportedInput(t *testing.T) {
	databaseURL := testsupport.DatabaseURL(t)
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	pool, err := pgxpool.New(ctx, databaseURL)
	if err != nil {
		t.Fatalf("pgxpool.New() error = %v", err)
	}
	defer pool.Close()

	workspace := t.TempDir()
	source := filepath.Join(workspace, "spoofed.png")
	if err := os.WriteFile(source, []byte("<svg/>"), 0o600); err != nil {
		t.Fatal(err)
	}
	store := &filesystemObjectStore{
		original: source,
		output:   filepath.Join(workspace, "objects"),
	}
	queries := dbgen.New(pool)
	assetUUID := uuid.New()
	assetID := pgtype.UUID{Bytes: assetUUID, Valid: true}
	if _, err := queries.CreateMediaAsset(
		ctx,
		dbgen.CreateMediaAssetParams{
			AssetID: assetID, Kind: dbgen.MediaKindImage,
			OriginalFilename:  "spoofed.png",
			OriginalObjectKey: "originals/image/spoofed/" + assetUUID.String(),
			MimeType:          "image/png", ByteSize: 6,
			Metadata: []byte(`{}`),
		},
	); err != nil {
		t.Fatal(err)
	}
	if _, err := queries.CompleteMediaAssetUpload(
		ctx,
		dbgen.CompleteMediaAssetUploadParams{
			AssetID: assetID, ByteSize: 6,
			MimeType: "image/png", Metadata: []byte(`{}`),
		},
	); err != nil {
		t.Fatal(err)
	}
	if err := queries.CreateProcessingJob(
		ctx,
		dbgen.CreateProcessingJobParams{
			AssetID: assetID, JobType: dbgen.ProcessingJobTypeImage,
			IdempotencyKey: "unsupported-test:" + assetUUID.String(),
		},
	); err != nil {
		t.Fatal(err)
	}
	worker := NewWorker(pool, store, WorkerOptions{
		ID: "retry-test-worker", ImageBinary: "magick",
		JobTimeout: 10 * time.Second,
	})
	for attempt := 1; attempt <= 3; attempt++ {
		processed, err := worker.ProcessOne(ctx)
		if err != nil || !processed {
			t.Fatalf("attempt %d = %v, %v", attempt, processed, err)
		}
		if attempt < 3 {
			if _, err := pool.Exec(
				ctx,
				"UPDATE processing_jobs SET run_after = NOW() WHERE asset_id = $1",
				assetID,
			); err != nil {
				t.Fatal(err)
			}
		}
	}
	asset, err := queries.GetMediaAsset(ctx, assetID)
	if err != nil {
		t.Fatal(err)
	}
	var attempts int
	var status string
	if err := pool.QueryRow(
		ctx,
		"SELECT attempts, status::TEXT FROM processing_jobs WHERE asset_id = $1",
		assetID,
	).Scan(&attempts, &status); err != nil {
		t.Fatal(err)
	}
	if asset.Status != dbgen.AssetStatusFailed ||
		attempts != 3 ||
		status != "failed" {
		t.Fatalf(
			"asset status = %s, attempts = %d, job status = %s",
			asset.Status,
			attempts,
			status,
		)
	}
	if _, err := os.Stat(store.output); !os.IsNotExist(err) {
		t.Fatalf("unexpected processing output, stat error = %v", err)
	}
}

func TestVideoWorkerCompletesDeliveryAndPoster(t *testing.T) {
	databaseURL := testsupport.DatabaseURL(t)
	ffmpeg, ffprobe := videoBinaries(t)
	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()
	pool, err := pgxpool.New(ctx, databaseURL)
	if err != nil {
		t.Fatalf("pgxpool.New() error = %v", err)
	}
	defer pool.Close()

	workspace := t.TempDir()
	source := filepath.Join(workspace, "source.mp4")
	runFixtureFFmpeg(
		t,
		ffmpeg,
		"-f", "lavfi", "-i", "color=c=#204060:s=320x180:r=30",
		"-t", "1",
		"-c:v", "libx264", "-pix_fmt", "yuv420p",
		"-movflags", "+faststart",
		source,
	)
	sourceInfo, err := os.Stat(source)
	if err != nil {
		t.Fatal(err)
	}
	store := &filesystemObjectStore{
		original: source,
		output:   filepath.Join(workspace, "objects"),
	}
	queries := dbgen.New(pool)
	assetUUID := uuid.New()
	assetID := pgtype.UUID{Bytes: assetUUID, Valid: true}
	if _, err := queries.CreateMediaAsset(
		ctx,
		dbgen.CreateMediaAssetParams{
			AssetID: assetID, Kind: dbgen.MediaKindVideo,
			OriginalFilename:  "source.mp4",
			OriginalObjectKey: "originals/video/source/" + assetUUID.String(),
			MimeType:          "video/mp4", ByteSize: sourceInfo.Size(),
			Metadata: []byte(`{}`),
		},
	); err != nil {
		t.Fatal(err)
	}
	if _, err := queries.CompleteMediaAssetUpload(
		ctx,
		dbgen.CompleteMediaAssetUploadParams{
			AssetID: assetID, ByteSize: sourceInfo.Size(),
			MimeType: "video/mp4", Metadata: []byte(`{}`),
		},
	); err != nil {
		t.Fatal(err)
	}
	if err := queries.CreateProcessingJob(
		ctx,
		dbgen.CreateProcessingJobParams{
			AssetID: assetID, JobType: dbgen.ProcessingJobTypeVideo,
			IdempotencyKey: "video-test:" + assetUUID.String(),
		},
	); err != nil {
		t.Fatal(err)
	}
	worker := NewWorker(pool, store, WorkerOptions{
		ID:           "video-test-worker",
		FFmpegBinary: ffmpeg, FFprobeBinary: ffprobe,
		JobTimeout: 30 * time.Second,
	})
	processed, err := worker.ProcessOne(ctx)
	if err != nil || !processed {
		t.Fatalf("ProcessOne() = %v, %v", processed, err)
	}
	asset, err := queries.GetMediaAsset(ctx, assetID)
	if err != nil {
		t.Fatal(err)
	}
	var variants int
	if err := pool.QueryRow(
		ctx,
		"SELECT COUNT(*) FROM asset_variants WHERE asset_id = $1",
		assetID,
	).Scan(&variants); err != nil {
		t.Fatal(err)
	}
	if asset.Status != dbgen.AssetStatusReady ||
		asset.MimeType != "video/mp4" ||
		asset.DurationMs == nil ||
		*asset.DurationMs < 900 ||
		variants != 2 {
		t.Fatalf("asset = %#v, variants = %d", asset, variants)
	}
}

func TestDocumentWorkerCompletesPreviewAndThumbnail(t *testing.T) {
	databaseURL := testsupport.DatabaseURL(t)
	binaries := documentBinaries(t)
	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()
	pool, err := pgxpool.New(ctx, databaseURL)
	if err != nil {
		t.Fatalf("pgxpool.New() error = %v", err)
	}
	defer pool.Close()

	workspace := t.TempDir()
	source := filepath.Join(workspace, "activity.md")
	if err := os.WriteFile(
		source,
		[]byte("# Portfolio Activity\n\nDocument preview."),
		0o600,
	); err != nil {
		t.Fatal(err)
	}
	sourceInfo, err := os.Stat(source)
	if err != nil {
		t.Fatal(err)
	}
	store := &filesystemObjectStore{
		original: source,
		output:   filepath.Join(workspace, "objects"),
	}
	queries := dbgen.New(pool)
	assetUUID := uuid.New()
	assetID := pgtype.UUID{Bytes: assetUUID, Valid: true}
	if _, err := queries.CreateMediaAsset(
		ctx,
		dbgen.CreateMediaAssetParams{
			AssetID: assetID, Kind: dbgen.MediaKindDocument,
			OriginalFilename:  "activity.md",
			OriginalObjectKey: "originals/document/activity/" + assetUUID.String(),
			MimeType:          "text/markdown", ByteSize: sourceInfo.Size(),
			Metadata: []byte(`{}`),
		},
	); err != nil {
		t.Fatal(err)
	}
	if _, err := queries.CompleteMediaAssetUpload(
		ctx,
		dbgen.CompleteMediaAssetUploadParams{
			AssetID: assetID, ByteSize: sourceInfo.Size(),
			MimeType: "text/markdown", Metadata: []byte(`{}`),
		},
	); err != nil {
		t.Fatal(err)
	}
	if err := queries.CreateProcessingJob(
		ctx,
		dbgen.CreateProcessingJobParams{
			AssetID: assetID, JobType: dbgen.ProcessingJobTypeDocument,
			IdempotencyKey: "document-test:" + assetUUID.String(),
		},
	); err != nil {
		t.Fatal(err)
	}
	worker := NewWorker(pool, store, WorkerOptions{
		ID:                "document-test-worker",
		ImageBinary:       binaries.image,
		LibreOfficeBinary: binaries.libreOffice,
		PDFInfoBinary:     binaries.pdfInfo,
		PDFToPPMBinary:    binaries.pdfToPPM,
		JobTimeout:        45 * time.Second,
	})
	processed, err := worker.ProcessOne(ctx)
	if err != nil || !processed {
		t.Fatalf("ProcessOne() = %v, %v", processed, err)
	}
	asset, err := queries.GetMediaAsset(ctx, assetID)
	if err != nil {
		t.Fatal(err)
	}
	var variants int
	if err := pool.QueryRow(
		ctx,
		"SELECT COUNT(*) FROM asset_variants WHERE asset_id = $1",
		assetID,
	).Scan(&variants); err != nil {
		t.Fatal(err)
	}
	if asset.Status != dbgen.AssetStatusReady ||
		asset.MimeType != "application/pdf" ||
		asset.PageCount == nil ||
		*asset.PageCount != 1 ||
		variants != 2 {
		t.Fatalf("asset = %#v, variants = %d", asset, variants)
	}
}

type filesystemObjectStore struct {
	original string
	output   string
}

func (f *filesystemObjectStore) PresignPut(
	context.Context,
	string,
	time.Duration,
) (*url.URL, error) {
	return url.Parse("https://storage.example.test")
}

func (f *filesystemObjectStore) PresignGet(
	context.Context,
	string,
	time.Duration,
) (*url.URL, error) {
	return url.Parse("https://storage.example.test")
}

func (f *filesystemObjectStore) Open(
	context.Context,
	string,
) (io.ReadSeekCloser, storage.ObjectInfo, error) {
	file, err := os.Open(f.original)
	if err != nil {
		return nil, storage.ObjectInfo{}, err
	}
	info, err := file.Stat()
	if err != nil {
		_ = file.Close()
		return nil, storage.ObjectInfo{}, err
	}
	return file, storage.ObjectInfo{Size: info.Size()}, nil
}

func (f *filesystemObjectStore) Stat(
	context.Context,
	string,
) (storage.ObjectInfo, error) {
	info, err := os.Stat(f.original)
	if err != nil {
		return storage.ObjectInfo{}, err
	}
	return storage.ObjectInfo{Size: info.Size()}, nil
}

func (f *filesystemObjectStore) Download(
	_ context.Context,
	_ string,
	destination string,
) error {
	return copyFile(f.original, destination)
}

func (f *filesystemObjectStore) Upload(
	_ context.Context,
	key string,
	source string,
	contentType string,
) (storage.ObjectInfo, error) {
	target := filepath.Join(f.output, filepath.FromSlash(key))
	if err := os.MkdirAll(filepath.Dir(target), 0o700); err != nil {
		return storage.ObjectInfo{}, err
	}
	if err := copyFile(source, target); err != nil {
		return storage.ObjectInfo{}, err
	}
	info, err := os.Stat(target)
	if err != nil {
		return storage.ObjectInfo{}, err
	}
	return storage.ObjectInfo{
		Size: info.Size(), ContentType: contentType,
	}, nil
}

func (f *filesystemObjectStore) Remove(context.Context, string) error {
	return nil
}

func (f *filesystemObjectStore) Ready(context.Context) error {
	return nil
}

func copyFile(source, target string) error {
	input, err := os.Open(source)
	if err != nil {
		return err
	}
	defer input.Close()
	output, err := os.OpenFile(target, os.O_CREATE|os.O_TRUNC|os.O_WRONLY, 0o600)
	if err != nil {
		return err
	}
	if _, err := io.Copy(output, input); err != nil {
		_ = output.Close()
		return err
	}
	return output.Close()
}

var _ storage.ObjectStore = (*filesystemObjectStore)(nil)
