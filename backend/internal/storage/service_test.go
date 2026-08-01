package storage

import (
	"context"
	"fmt"
	"io"
	"net/url"
	"strings"
	"testing"
	"time"

	"github.com/M-Aidil-Fitrah/portofolio/backend/internal/testsupport"
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

func TestDocumentFilenameRejectsMacroEnabledFormats(t *testing.T) {
	for _, filename := range []string{"report.docm", "budget.xlsm", "slides.pptm"} {
		if validDocumentFilename(filename) {
			t.Fatalf("%q should be rejected", filename)
		}
	}
	for _, filename := range []string{
		"report.docx", "slides.pptx", "budget.xlsx",
		"preview.pdf", "notes.md",
	} {
		if !validDocumentFilename(filename) {
			t.Fatalf("%q should be accepted", filename)
		}
	}
}

func TestServiceUploadLifecycle(t *testing.T) {
	databaseURL := testsupport.DatabaseURL(t)
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
	if len(store.removedKeys) != 1 ||
		store.removedKeys[0] != store.presignedKey {
		t.Fatalf(
			"removed keys = %q, want [%q]",
			store.removedKeys,
			store.presignedKey,
		)
	}
}

type fakeObjectStore struct {
	info         ObjectInfo
	body         string
	presignedKey string
	openedKey    string
	removedKeys  []string
}

func (f *fakeObjectStore) PresignPut(
	_ context.Context,
	key string,
	_ time.Duration,
) (*url.URL, error) {
	f.presignedKey = key
	return url.Parse("https://storage.example.test/" + key)
}

func (f *fakeObjectStore) PresignGet(
	_ context.Context,
	key string,
	_ time.Duration,
) (*url.URL, error) {
	return url.Parse("https://storage.example.test/" + key)
}

func (f *fakeObjectStore) Open(
	_ context.Context,
	key string,
) (io.ReadSeekCloser, ObjectInfo, error) {
	f.openedKey = key
	body := f.body
	if body == "" {
		body = "asset-bytes"
	}
	info := f.info
	info.Size = int64(len(body))
	return nopReadSeekCloser{strings.NewReader(body)}, info, nil
}

type nopReadSeekCloser struct {
	*strings.Reader
}

func (nopReadSeekCloser) Close() error { return nil }

func (f *fakeObjectStore) Stat(
	context.Context,
	string,
) (ObjectInfo, error) {
	return f.info, nil
}

func (f *fakeObjectStore) Download(
	context.Context,
	string,
	string,
) error {
	return nil
}

func (f *fakeObjectStore) Upload(
	context.Context,
	string,
	string,
	string,
) (ObjectInfo, error) {
	return ObjectInfo{}, nil
}

func (f *fakeObjectStore) Remove(_ context.Context, key string) error {
	f.removedKeys = append(f.removedKeys, key)
	return nil
}

func (f *fakeObjectStore) Ready(context.Context) error {
	return nil
}

var _ ObjectStore = (*fakeObjectStore)(nil)

// Deleting used to leave every processed derivative readable in storage.
func TestDeleteRemovesProcessedDerivatives(t *testing.T) {
	databaseURL := testsupport.DatabaseURL(t)
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	pool, err := pgxpool.New(ctx, databaseURL)
	if err != nil {
		t.Fatalf("pgxpool.New() error = %v", err)
	}
	defer pool.Close()
	testsupport.ResetDatabase(t, ctx, pool)

	store := &fakeObjectStore{
		info: ObjectInfo{Size: 2048, ContentType: "image/png"},
	}
	service := NewService(pool, store, 15*time.Minute)
	presigned, err := service.Presign(ctx, PresignInput{
		Kind:     "image",
		Filename: "cover.png",
		MimeType: "image/png",
		ByteSize: 2048,
	})
	if err != nil {
		t.Fatalf("Presign() error = %v", err)
	}
	if _, err := service.Complete(ctx, presigned.Asset.ID); err != nil {
		t.Fatalf("Complete() error = %v", err)
	}

	delivery := "processed/images/" + presigned.Asset.ID + "/master.webp"
	if _, err := pool.Exec(
		ctx,
		`UPDATE media_assets
		 SET status = 'ready', delivery_object_key = $2
		 WHERE id = $1`,
		presigned.Asset.ID,
		delivery,
	); err != nil {
		t.Fatalf("set delivery key: %v", err)
	}
	variants := []string{
		"processed/images/" + presigned.Asset.ID + "/responsive_480.webp",
		"processed/images/" + presigned.Asset.ID + "/cover_1600x900.webp",
	}
	for index, objectKey := range variants {
		if _, err := pool.Exec(
			ctx,
			`INSERT INTO asset_variants
			   (asset_id, variant_key, object_key, mime_type, byte_size)
			 VALUES ($1, $2, $3, 'image/webp', 1024)`,
			presigned.Asset.ID,
			fmt.Sprintf("variant_%d", index),
			objectKey,
		); err != nil {
			t.Fatalf("insert variant: %v", err)
		}
	}

	if err := service.Delete(ctx, presigned.Asset.ID); err != nil {
		t.Fatalf("Delete() error = %v", err)
	}

	removed := map[string]bool{}
	for _, key := range store.removedKeys {
		removed[key] = true
	}
	for _, objectKey := range append(variants, delivery, store.presignedKey) {
		if !removed[objectKey] {
			t.Fatalf(
				"object %q survived delete; removed = %q",
				objectKey,
				store.removedKeys,
			)
		}
	}
}
