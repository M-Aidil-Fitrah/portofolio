package activity

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/M-Aidil-Fitrah/portofolio/backend/internal/database/dbgen"
	"github.com/M-Aidil-Fitrah/portofolio/backend/internal/testsupport"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Publishing unprocessed media would put a broken image on the public site.
func TestPublishRequiresEveryLinkedAssetToBeReady(t *testing.T) {
	databaseURL := testsupport.DatabaseURL(t)
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	pool, err := pgxpool.New(ctx, databaseURL)
	if err != nil {
		t.Fatalf("pgxpool.New() error = %v", err)
	}
	defer pool.Close()
	testsupport.ResetDatabase(t, ctx, pool)

	queries := dbgen.New(pool)
	assetUUID := uuid.New()
	assetID := pgtype.UUID{Bytes: assetUUID, Valid: true}
	if _, err := queries.CreateMediaAsset(
		ctx,
		dbgen.CreateMediaAssetParams{
			AssetID:           assetID,
			Kind:              dbgen.MediaKindImage,
			OriginalFilename:  "cover.png",
			OriginalObjectKey: "originals/image/publish/" + assetUUID.String(),
			MimeType:          "image/png",
			ByteSize:          2048,
			Metadata:          []byte(`{}`),
		},
	); err != nil {
		t.Fatalf("CreateMediaAsset() error = %v", err)
	}

	service := NewService(pool)
	cover := []AssetInput{{
		ID:       assetUUID.String(),
		Role:     "cover",
		Position: 0,
		Alt:      "Cover still processing",
	}}
	input := WriteInput{
		Title:    LocalizedText{ID: "Aktivitas", EN: "Activity"},
		Category: "project",
		Date:     time.Date(2026, 7, 31, 0, 0, 0, 0, time.UTC),
		Assets:   cover,
		Status:   "published",
	}

	if _, err := service.Create(ctx, input); !errors.Is(err, ErrConflict) {
		t.Fatalf("publish with unready asset = %v, want ErrConflict", err)
	}

	// The same activity must still be storable as a draft.
	input.Status = "draft"
	draft, err := service.Create(ctx, input)
	if err != nil {
		t.Fatalf("draft with unready asset error = %v", err)
	}

	if _, err := queries.CompleteMediaAssetUpload(
		ctx,
		dbgen.CompleteMediaAssetUploadParams{
			AssetID:  assetID,
			ByteSize: 2048,
			MimeType: "image/png",
			Metadata: []byte(`{}`),
		},
	); err != nil {
		t.Fatalf("CompleteMediaAssetUpload() error = %v", err)
	}
	if _, err := pool.Exec(
		ctx,
		"UPDATE media_assets SET status = 'ready' WHERE id = $1",
		assetID,
	); err != nil {
		t.Fatalf("mark asset ready: %v", err)
	}

	input.Status = "published"
	input.Version = draft.Version
	published, err := service.Update(ctx, draft.ID, input)
	if err != nil {
		t.Fatalf("publish after asset is ready error = %v", err)
	}
	if published.Status != "published" {
		t.Fatalf("status = %q, want published", published.Status)
	}
}
