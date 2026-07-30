package storage

import (
	"context"
	"net/url"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

func TestPerFileLimitsAndDeclaredMIME(t *testing.T) {
	cases := []struct {
		kind     string
		mimeType string
		size     int64
		valid    bool
	}{
		{"image", "image/heic", MaxImageSize, true},
		{"image", "image/png", MaxImageSize + 1, false},
		{"video", "video/quicktime", MaxVideoSize, true},
		{"video", "application/pdf", 1024, false},
		{"document", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", MaxDocumentSize, true},
		{"document", "text/markdown", 1024, true},
	}
	for _, item := range cases {
		_, limit, kindOK := mediaKind(item.kind)
		got := kindOK &&
			validDeclaredMIME(item.kind, item.mimeType) &&
			item.size > 0 &&
			item.size <= limit
		if got != item.valid {
			t.Fatalf("%#v valid = %v", item, got)
		}
	}
}

func TestServiceUploadLifecycle(t *testing.T) {
	databaseURL := os.Getenv("TEST_DATABASE_URL")
	if databaseURL == "" {
		t.Skip("TEST_DATABASE_URL is not set")
	}
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	pool, err := pgxpool.New(ctx, databaseURL)
	if err != nil {
		t.Fatalf("pgxpool.New() error = %v", err)
	}
	defer pool.Close()

	store := &fakeObjectStore{
		info: ObjectInfo{
			Size:        2048,
			ContentType: "image/png",
			ETag:        "test-etag",
		},
	}
	service := NewService(pool, store, 15*time.Minute)
	service.now = func() time.Time {
		return time.Date(2026, 7, 31, 12, 0, 0, 0, time.UTC)
	}
	presigned, err := service.Presign(ctx, PresignInput{
		Kind:     "image",
		Filename: "../portrait.png",
		MimeType: "image/png",
		ByteSize: 2048,
	})
	if err != nil {
		t.Fatalf("Presign() error = %v", err)
	}
	if presigned.Asset.Filename != "portrait.png" ||
		!strings.Contains(store.presignedKey, "/image/2026/07/") {
		t.Fatalf("presigned = %#v, key = %q", presigned, store.presignedKey)
	}

	completed, err := service.Complete(ctx, presigned.Asset.ID)
	if err != nil {
		t.Fatalf("Complete() error = %v", err)
	}
	if completed.Status != "queued" || completed.ByteSize != 2048 {
		t.Fatalf("completed = %#v", completed)
	}
	if _, err := service.Complete(ctx, presigned.Asset.ID); err != ErrConflict {
		t.Fatalf("second Complete() error = %v, want ErrConflict", err)
	}
	if err := service.Delete(ctx, presigned.Asset.ID); err != nil {
		t.Fatalf("Delete() error = %v", err)
	}
	if store.removedKey != store.presignedKey {
		t.Fatalf("removed key = %q, want %q", store.removedKey, store.presignedKey)
	}
}

type fakeObjectStore struct {
	info         ObjectInfo
	presignedKey string
	removedKey   string
}

func (f *fakeObjectStore) PresignPut(
	_ context.Context,
	key string,
	_ time.Duration,
) (*url.URL, error) {
	f.presignedKey = key
	return url.Parse("https://storage.example.test/" + key)
}

func (f *fakeObjectStore) Stat(
	context.Context,
	string,
) (ObjectInfo, error) {
	return f.info, nil
}

func (f *fakeObjectStore) Remove(_ context.Context, key string) error {
	f.removedKey = key
	return nil
}

func (f *fakeObjectStore) Ready(context.Context) error {
	return nil
}

var _ ObjectStore = (*fakeObjectStore)(nil)
