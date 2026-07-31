package storage

import (
	"bytes"
	"context"
	"io"
	"net/http"
	"os"
	"testing"
	"time"

	"github.com/M-Aidil-Fitrah/portofolio/backend/internal/testsupport"
	"github.com/minio/minio-go/v7"
)

func TestMinioStorePresignStatAndRemove(t *testing.T) {
	cfg := testsupport.StorageConfig(t)
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	store, err := NewMinioStore(cfg)
	if err != nil {
		t.Fatalf("NewMinioStore() error = %v", err)
	}
	if err := store.client.MakeBucket(
		ctx,
		cfg.Bucket,
		minio.MakeBucketOptions{Region: cfg.Region},
	); err != nil {
		t.Fatalf("MakeBucket() error = %v", err)
	}
	t.Cleanup(func() {
		_ = store.client.RemoveBucket(context.Background(), cfg.Bucket)
	})
	if err := store.Ready(ctx); err != nil {
		t.Fatalf("Ready() error = %v", err)
	}

	const key = "originals/image/test-object"
	uploadURL, err := store.PresignPut(ctx, key, time.Minute)
	if err != nil {
		t.Fatalf("PresignPut() error = %v", err)
	}
	request, err := http.NewRequestWithContext(
		ctx,
		http.MethodPut,
		uploadURL.String(),
		bytes.NewBufferString("portfolio"),
	)
	if err != nil {
		t.Fatalf("NewRequestWithContext() error = %v", err)
	}
	request.Header.Set("Content-Type", "image/png")
	response, err := http.DefaultClient.Do(request)
	if err != nil {
		t.Fatalf("upload request error = %v", err)
	}
	_, _ = io.Copy(io.Discard, response.Body)
	_ = response.Body.Close()
	if response.StatusCode != http.StatusOK {
		t.Fatalf("upload status = %d", response.StatusCode)
	}

	info, err := store.Stat(ctx, key)
	if err != nil {
		t.Fatalf("Stat() error = %v", err)
	}
	if info.Size != int64(len("portfolio")) {
		t.Fatalf("Stat().Size = %d", info.Size)
	}
	downloaded := t.TempDir() + "/downloaded"
	if err := store.Download(ctx, key, downloaded); err != nil {
		t.Fatalf("Download() error = %v", err)
	}
	body, err := os.ReadFile(downloaded)
	if err != nil || string(body) != "portfolio" {
		t.Fatalf("downloaded = %q, error = %v", body, err)
	}
	const variantKey = "processed/images/test/master.webp"
	uploaded, err := store.Upload(
		ctx,
		variantKey,
		downloaded,
		"image/webp",
	)
	if err != nil || uploaded.Size != int64(len("portfolio")) {
		t.Fatalf("Upload() = %#v, error = %v", uploaded, err)
	}
	if err := store.Remove(ctx, variantKey); err != nil {
		t.Fatalf("Remove(variant) error = %v", err)
	}
	if err := store.Remove(ctx, key); err != nil {
		t.Fatalf("Remove() error = %v", err)
	}
}
