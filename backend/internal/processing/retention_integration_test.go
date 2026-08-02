package processing

import (
	"context"
	"errors"
	"io"
	"net/url"
	"testing"
	"time"

	"github.com/M-Aidil-Fitrah/portofolio/backend/internal/database/dbgen"
	"github.com/M-Aidil-Fitrah/portofolio/backend/internal/storage"
	"github.com/M-Aidil-Fitrah/portofolio/backend/internal/testsupport"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
)

// The sweeper is the only thing that deletes bytes nobody asked it to delete,
// so the boundaries matter more than the happy path: a document original is
// still the public download, and an image younger than the window may still be
// needed to reprocess.
func TestRetentionPurgesOnlyExpiredNonDocumentOriginals(t *testing.T) {
	databaseURL := testsupport.DatabaseURL(t)
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	pool, err := pgxpool.New(ctx, databaseURL)
	if err != nil {
		t.Fatalf("pgxpool.New() error = %v", err)
	}
	defer pool.Close()
	testsupport.ResetDatabase(t, ctx, pool)

	expiredImage := seedReadyAsset(
		t, ctx, pool, dbgen.MediaKindImage, 4*24*time.Hour,
	)
	freshImage := seedReadyAsset(
		t, ctx, pool, dbgen.MediaKindImage, time.Hour,
	)
	expiredDocument := seedReadyAsset(
		t, ctx, pool, dbgen.MediaKindDocument, 4*24*time.Hour,
	)

	store := &recordingObjectStore{}
	retention := NewRetention(pool, store, RetentionOptions{
		Retention: 72 * time.Hour, SweepInterval: time.Hour,
	})
	purged, err := retention.SweepOnce(ctx)
	if err != nil {
		t.Fatalf("SweepOnce() error = %v", err)
	}
	if purged != 1 {
		t.Fatalf("SweepOnce() purged = %d, want 1", purged)
	}
	if len(store.removed) != 1 || store.removed[0] != expiredImage.objectKey {
		t.Fatalf("removed = %v, want [%s]", store.removed, expiredImage.objectKey)
	}
	assertOriginalPurged(t, ctx, pool, expiredImage.id, true)
	assertOriginalPurged(t, ctx, pool, freshImage.id, false)
	assertOriginalPurged(t, ctx, pool, expiredDocument.id, false)

	// A purged asset must not come back on the next sweep, or every tick would
	// re-delete the same objects for the lifetime of the row.
	purged, err = retention.SweepOnce(ctx)
	if err != nil {
		t.Fatalf("second SweepOnce() error = %v", err)
	}
	if purged != 0 || len(store.removed) != 1 {
		t.Fatalf("second sweep purged = %d, removed = %v", purged, store.removed)
	}
}

// A failing object store must leave the row untouched: marking it purged while
// the object survives would strand the object with nothing pointing at it.
func TestRetentionKeepsRowWhenObjectRemovalFails(t *testing.T) {
	databaseURL := testsupport.DatabaseURL(t)
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	pool, err := pgxpool.New(ctx, databaseURL)
	if err != nil {
		t.Fatalf("pgxpool.New() error = %v", err)
	}
	defer pool.Close()
	testsupport.ResetDatabase(t, ctx, pool)

	expired := seedReadyAsset(
		t, ctx, pool, dbgen.MediaKindVideo, 5*24*time.Hour,
	)
	store := &recordingObjectStore{removeErr: errors.New("storage is down")}
	retention := NewRetention(pool, store, RetentionOptions{
		Retention: 72 * time.Hour,
	})

	purged, err := retention.SweepOnce(ctx)
	if err == nil {
		t.Fatal("SweepOnce() error = nil, want removal failure")
	}
	if purged != 0 {
		t.Fatalf("SweepOnce() purged = %d, want 0", purged)
	}
	assertOriginalPurged(t, ctx, pool, expired.id, false)

	// The retry succeeds once storage recovers, so nothing is lost.
	store.removeErr = nil
	purged, err = retention.SweepOnce(ctx)
	if err != nil {
		t.Fatalf("retry SweepOnce() error = %v", err)
	}
	if purged != 1 {
		t.Fatalf("retry SweepOnce() purged = %d, want 1", purged)
	}
	assertOriginalPurged(t, ctx, pool, expired.id, true)
}

type seededAsset struct {
	id        pgtype.UUID
	objectKey string
}

// seedReadyAsset writes an asset that already finished processing, with
// ready_at backdated by age.
func seedReadyAsset(
	t *testing.T,
	ctx context.Context,
	pool *pgxpool.Pool,
	kind dbgen.MediaKind,
	age time.Duration,
) seededAsset {
	t.Helper()
	assetUUID := uuid.New()
	assetID := pgtype.UUID{Bytes: assetUUID, Valid: true}
	objectKey := "originals/" + string(kind) + "/retention/" + assetUUID.String()
	deliveryKey := "processed/" + string(kind) + "/" + assetUUID.String()
	if _, err := dbgen.New(pool).CreateMediaAsset(
		ctx,
		dbgen.CreateMediaAssetParams{
			AssetID: assetID, Kind: kind,
			OriginalFilename:  "retention-fixture",
			OriginalObjectKey: objectKey,
			MimeType:          "application/octet-stream", ByteSize: 1024,
			Metadata: []byte(`{}`),
		},
	); err != nil {
		t.Fatalf("CreateMediaAsset() error = %v", err)
	}
	if _, err := pool.Exec(
		ctx,
		`UPDATE media_assets
		 SET status = 'ready',
		     delivery_object_key = $2,
		     ready_at = NOW() - $3::INTERVAL
		 WHERE id = $1`,
		assetID,
		deliveryKey,
		age.String(),
	); err != nil {
		t.Fatalf("mark asset ready: %v", err)
	}
	return seededAsset{id: assetID, objectKey: objectKey}
}

func assertOriginalPurged(
	t *testing.T,
	ctx context.Context,
	pool *pgxpool.Pool,
	assetID pgtype.UUID,
	want bool,
) {
	t.Helper()
	var purgedAt pgtype.Timestamptz
	if err := pool.QueryRow(
		ctx,
		"SELECT original_purged_at FROM media_assets WHERE id = $1",
		assetID,
	).Scan(&purgedAt); err != nil {
		t.Fatalf("read original_purged_at: %v", err)
	}
	if purgedAt.Valid != want {
		t.Fatalf(
			"asset %s original_purged_at valid = %t, want %t",
			uuid.UUID(assetID.Bytes),
			purgedAt.Valid,
			want,
		)
	}
}

type recordingObjectStore struct {
	removed   []string
	removeErr error
}

func (s *recordingObjectStore) Remove(_ context.Context, key string) error {
	if s.removeErr != nil {
		return s.removeErr
	}
	s.removed = append(s.removed, key)
	return nil
}

func (s *recordingObjectStore) PresignPut(
	context.Context,
	string,
	time.Duration,
) (*url.URL, error) {
	return url.Parse("https://storage.example.test")
}

func (s *recordingObjectStore) PresignGet(
	context.Context,
	string,
	time.Duration,
) (*url.URL, error) {
	return url.Parse("https://storage.example.test")
}

func (s *recordingObjectStore) Open(
	context.Context,
	string,
) (io.ReadSeekCloser, storage.ObjectInfo, error) {
	return nil, storage.ObjectInfo{}, errors.New("not implemented")
}

func (s *recordingObjectStore) Stat(
	context.Context,
	string,
) (storage.ObjectInfo, error) {
	return storage.ObjectInfo{}, errors.New("not implemented")
}

func (s *recordingObjectStore) Download(
	context.Context,
	string,
	string,
) error {
	return errors.New("not implemented")
}

func (s *recordingObjectStore) Upload(
	context.Context,
	string,
	string,
	string,
) (storage.ObjectInfo, error) {
	return storage.ObjectInfo{}, errors.New("not implemented")
}

func (s *recordingObjectStore) Ready(context.Context) error {
	return nil
}
