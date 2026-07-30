package storage

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"path/filepath"
	"strings"
	"time"

	"github.com/M-Aidil-Fitrah/portofolio/backend/internal/database/dbgen"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
)

const (
	MaxImageSize    int64 = 25 << 20
	MaxVideoSize    int64 = 250 << 20
	MaxDocumentSize int64 = 50 << 20
)

var (
	ErrInvalid  = errors.New("invalid asset")
	ErrNotFound = errors.New("asset not found")
	ErrConflict = errors.New("asset conflict")
)

type PresignInput struct {
	Kind     string
	Filename string
	MimeType string
	ByteSize int64
}

type PresignResult struct {
	Asset     Asset
	UploadURL string
	ExpiresAt time.Time
}

type Asset struct {
	ID           string
	Kind         string
	Status       string
	Filename     string
	MimeType     string
	ByteSize     int64
	Width        *int32
	Height       *int32
	DurationMS   *int64
	PageCount    *int32
	ErrorCode    *string
	ErrorMessage *string
	ReadyAt      *time.Time
	CreatedAt    time.Time
	UpdatedAt    time.Time
}

type Service struct {
	pool    *pgxpool.Pool
	queries *dbgen.Queries
	store   ObjectStore
	expiry  time.Duration
	now     func() time.Time
}

func NewService(
	pool *pgxpool.Pool,
	store ObjectStore,
	expiry time.Duration,
) *Service {
	return &Service{
		pool: pool, queries: dbgen.New(pool), store: store,
		expiry: expiry, now: time.Now,
	}
}

func (s *Service) Presign(
	ctx context.Context,
	input PresignInput,
) (PresignResult, error) {
	kind, limit, ok := mediaKind(input.Kind)
	filename := strings.TrimSpace(filepath.Base(input.Filename))
	mimeType := strings.ToLower(strings.TrimSpace(input.MimeType))
	if !ok || filename == "" || filename == "." ||
		len(filename) > 255 || !validDeclaredMIME(string(kind), mimeType) ||
		input.ByteSize <= 0 || input.ByteSize > limit {
		return PresignResult{}, ErrInvalid
	}

	id := uuid.New()
	objectKey := fmt.Sprintf(
		"originals/%s/%04d/%02d/%s",
		kind,
		s.now().UTC().Year(),
		s.now().UTC().Month(),
		id.String(),
	)
	created, err := s.queries.CreateMediaAsset(
		ctx,
		dbgen.CreateMediaAssetParams{
			AssetID:           pgUUID(id),
			Kind:              kind,
			OriginalFilename:  filename,
			OriginalObjectKey: objectKey,
			MimeType:          mimeType,
			ByteSize:          input.ByteSize,
			Metadata:          []byte(`{"upload":"presigned"}`),
		},
	)
	if err != nil {
		return PresignResult{}, fmt.Errorf("create media asset: %w", err)
	}

	uploadURL, err := s.store.PresignPut(ctx, objectKey, s.expiry)
	if err != nil {
		_, _ = s.queries.DeleteUnlinkedMediaAsset(ctx, pgUUID(id))
		return PresignResult{}, fmt.Errorf("create upload URL: %w", err)
	}
	return PresignResult{
		Asset:     mapAsset(created),
		UploadURL: uploadURL.String(),
		ExpiresAt: s.now().UTC().Add(s.expiry),
	}, nil
}

func (s *Service) Complete(ctx context.Context, rawID string) (Asset, error) {
	id, err := parseUUID(rawID)
	if err != nil {
		return Asset{}, ErrInvalid
	}
	current, err := s.queries.GetMediaAsset(ctx, id)
	if errors.Is(err, pgx.ErrNoRows) {
		return Asset{}, ErrNotFound
	}
	if err != nil {
		return Asset{}, fmt.Errorf("get media asset: %w", err)
	}
	if current.Status != dbgen.AssetStatusUploading {
		return Asset{}, ErrConflict
	}

	info, err := s.store.Stat(ctx, current.OriginalObjectKey)
	if err != nil {
		return Asset{}, fmt.Errorf("verify uploaded object: %w", err)
	}
	_, limit, _ := mediaKind(string(current.Kind))
	if info.Size <= 0 || info.Size > limit {
		return Asset{}, ErrInvalid
	}
	contentType := strings.ToLower(strings.TrimSpace(info.ContentType))
	if contentType == "" {
		contentType = current.MimeType
	}
	metadata, err := json.Marshal(map[string]string{"etag": info.ETag})
	if err != nil {
		return Asset{}, fmt.Errorf("encode object metadata: %w", err)
	}

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return Asset{}, fmt.Errorf("begin complete upload: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()
	qtx := s.queries.WithTx(tx)
	completed, err := qtx.CompleteMediaAssetUpload(
		ctx,
		dbgen.CompleteMediaAssetUploadParams{
			AssetID:  id,
			ByteSize: info.Size,
			MimeType: contentType,
			Metadata: metadata,
		},
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return Asset{}, ErrConflict
	}
	if err != nil {
		return Asset{}, fmt.Errorf("complete media asset: %w", err)
	}
	if err := qtx.CreateProcessingJob(
		ctx,
		dbgen.CreateProcessingJobParams{
			AssetID:        id,
			JobType:        dbgen.ProcessingJobType(current.Kind),
			IdempotencyKey: "process:" + rawID,
		},
	); err != nil {
		return Asset{}, fmt.Errorf("enqueue processing job: %w", err)
	}
	if err := tx.Commit(ctx); err != nil {
		return Asset{}, fmt.Errorf("commit complete upload: %w", err)
	}
	return mapAsset(completed), nil
}

func (s *Service) Get(ctx context.Context, rawID string) (Asset, error) {
	id, err := parseUUID(rawID)
	if err != nil {
		return Asset{}, ErrInvalid
	}
	value, err := s.queries.GetMediaAsset(ctx, id)
	if errors.Is(err, pgx.ErrNoRows) {
		return Asset{}, ErrNotFound
	}
	if err != nil {
		return Asset{}, fmt.Errorf("get media asset: %w", err)
	}
	return mapAsset(value), nil
}

func (s *Service) Delete(ctx context.Context, rawID string) error {
	id, err := parseUUID(rawID)
	if err != nil {
		return ErrInvalid
	}
	value, err := s.queries.GetMediaAsset(ctx, id)
	if errors.Is(err, pgx.ErrNoRows) {
		return ErrNotFound
	}
	if err != nil {
		return fmt.Errorf("get media asset: %w", err)
	}
	if links, err := s.queries.CountActivityAssetLinks(ctx, id); err != nil {
		return fmt.Errorf("count asset links: %w", err)
	} else if links > 0 {
		return ErrConflict
	}
	if err := s.store.Remove(ctx, value.OriginalObjectKey); err != nil {
		return err
	}
	deleted, err := s.queries.DeleteUnlinkedMediaAsset(ctx, id)
	if err != nil {
		return fmt.Errorf("delete media asset: %w", err)
	}
	if deleted == 0 {
		return ErrConflict
	}
	return nil
}

func mediaKind(value string) (dbgen.MediaKind, int64, bool) {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "image":
		return dbgen.MediaKindImage, MaxImageSize, true
	case "video":
		return dbgen.MediaKindVideo, MaxVideoSize, true
	case "document":
		return dbgen.MediaKindDocument, MaxDocumentSize, true
	default:
		return "", 0, false
	}
}

func validDeclaredMIME(kind, value string) bool {
	if value == "" || len(value) > 255 {
		return false
	}
	switch kind {
	case "image":
		return strings.HasPrefix(value, "image/")
	case "video":
		return strings.HasPrefix(value, "video/")
	case "document":
		return strings.HasPrefix(value, "application/") ||
			strings.HasPrefix(value, "text/")
	default:
		return false
	}
}

func parseUUID(value string) (pgtype.UUID, error) {
	var parsed pgtype.UUID
	if err := parsed.Scan(value); err != nil {
		return pgtype.UUID{}, err
	}
	return parsed, nil
}

func pgUUID(value uuid.UUID) pgtype.UUID {
	return pgtype.UUID{Bytes: value, Valid: true}
}

func mapAsset(value dbgen.MediaAsset) Asset {
	var readyAt *time.Time
	if value.ReadyAt.Valid {
		readyAt = &value.ReadyAt.Time
	}
	return Asset{
		ID:           uuid.UUID(value.ID.Bytes).String(),
		Kind:         string(value.Kind),
		Status:       string(value.Status),
		Filename:     value.OriginalFilename,
		MimeType:     value.MimeType,
		ByteSize:     value.ByteSize,
		Width:        value.Width,
		Height:       value.Height,
		DurationMS:   value.DurationMs,
		PageCount:    value.PageCount,
		ErrorCode:    value.ErrorCode,
		ErrorMessage: value.ErrorMessage,
		ReadyAt:      readyAt,
		CreatedAt:    value.CreatedAt.Time,
		UpdatedAt:    value.UpdatedAt.Time,
	}
}
