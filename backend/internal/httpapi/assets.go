package httpapi

import (
	"errors"
	"net/http"
	"time"

	"github.com/M-Aidil-Fitrah/portofolio/backend/internal/contract"
	"github.com/M-Aidil-Fitrah/portofolio/backend/internal/storage"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

func (s *server) PresignAdminAssetUpload(c *gin.Context) {
	if !s.requireWebOrigin(c) || !s.requireAdmin(c) {
		return
	}
	if s.assets == nil {
		assetUnavailable(c)
		return
	}
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, 16<<10)
	var request contract.PresignAssetUploadRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		invalidAssetRequest(c)
		return
	}
	result, err := s.assets.Presign(
		c.Request.Context(),
		storage.PresignInput{
			Kind:     string(request.Kind),
			Filename: request.Filename,
			MimeType: request.MimeType,
			ByteSize: request.ByteSize,
		},
	)
	if err != nil {
		s.respondAssetError(c, err)
		return
	}
	c.JSON(http.StatusCreated, contract.PresignedAssetUpload{
		Asset:     assetResponse(result.Asset),
		ExpiresAt: result.ExpiresAt,
		Method:    contract.PUT,
		UploadURL: result.UploadURL,
	})
}

func (s *server) CompleteAdminAssetUpload(
	c *gin.Context,
	id contract.AssetID,
) {
	if !s.requireWebOrigin(c) || !s.requireAdmin(c) {
		return
	}
	if s.assets == nil {
		assetUnavailable(c)
		return
	}
	value, err := s.assets.Complete(c.Request.Context(), id.String())
	if err != nil {
		s.respondAssetError(c, err)
		return
	}
	c.JSON(http.StatusOK, assetResponse(value))
}

func (s *server) GetAdminAsset(c *gin.Context, id contract.AssetID) {
	if !s.requireAdmin(c) {
		return
	}
	if s.assets == nil {
		assetUnavailable(c)
		return
	}
	value, err := s.assets.Get(c.Request.Context(), id.String())
	if err != nil {
		s.respondAssetError(c, err)
		return
	}
	c.JSON(http.StatusOK, assetResponse(value))
}

func (s *server) DeleteAdminAsset(c *gin.Context, id contract.AssetID) {
	if !s.requireWebOrigin(c) || !s.requireAdmin(c) {
		return
	}
	if s.assets == nil {
		assetUnavailable(c)
		return
	}
	if err := s.assets.Delete(c.Request.Context(), id.String()); err != nil {
		s.respondAssetError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

func (s *server) GetAssetContent(
	c *gin.Context,
	id contract.AssetID,
	params contract.GetAssetContentParams,
) {
	if s.assets == nil {
		assetUnavailable(c)
		return
	}
	if !params.Variant.Valid() {
		invalidAssetRequest(c)
		return
	}
	value, err := s.assets.ContentURL(
		c.Request.Context(),
		id.String(),
		string(params.Variant),
		false,
	)
	if err != nil {
		s.respondAssetError(c, err)
		return
	}
	// Publicly linked bytes are immutable once processed, and the asset id
	// changes whenever the bytes do, so this can be cached aggressively.
	c.Header("Cache-Control", "public, max-age=31536000, immutable")
	c.Redirect(http.StatusTemporaryRedirect, value)
}

// GetAdminAssetContent streams protected bytes: a browser drops credentials
// across a cross-origin redirect, so presigned URLs cannot serve these.
func (s *server) GetAdminAssetContent(
	c *gin.Context,
	id contract.AssetID,
	params contract.GetAdminAssetContentParams,
) {
	if !s.requireAdmin(c) {
		return
	}
	if s.assets == nil {
		assetUnavailable(c)
		return
	}
	if !params.Variant.Valid() {
		invalidAssetRequest(c)
		return
	}
	reader, info, err := s.assets.OpenContent(
		c.Request.Context(),
		id.String(),
		string(params.Variant),
		true,
	)
	if err != nil {
		s.respondAssetError(c, err)
		return
	}
	defer func() { _ = reader.Close() }()

	if info.ContentType != "" {
		c.Header("Content-Type", info.ContentType)
	}
	if info.ETag != "" {
		c.Header("ETag", info.ETag)
	}
	c.Header("Cache-Control", "private, no-store")
	// ServeContent negotiates range requests and conditional reads, which
	// video scrubbing and the PDF reader both rely on.
	http.ServeContent(
		c.Writer,
		c.Request,
		"",
		time.Time{},
		reader,
	)
}

func (s *server) respondAssetError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, storage.ErrInvalid):
		invalidAssetRequest(c)
	case errors.Is(err, storage.ErrNotFound):
		respondError(
			c,
			http.StatusNotFound,
			"asset_not_found",
			"The requested asset was not found.",
		)
	case errors.Is(err, storage.ErrConflict):
		respondError(
			c,
			http.StatusConflict,
			"asset_conflict",
			"The asset state does not allow this operation.",
		)
	default:
		respondError(
			c,
			http.StatusInternalServerError,
			"internal_error",
			"The asset request could not be completed.",
		)
	}
}

func assetResponse(value storage.Asset) contract.MediaAsset {
	return contract.MediaAsset{
		ID:           uuid.MustParse(value.ID),
		Kind:         contract.MediaKind(value.Kind),
		Status:       contract.AssetStatus(value.Status),
		Filename:     value.Filename,
		MimeType:     value.MimeType,
		ByteSize:     value.ByteSize,
		Width:        optionalInt32(value.Width),
		Height:       optionalInt32(value.Height),
		DurationMs:   value.DurationMS,
		PageCount:    optionalInt32(value.PageCount),
		ErrorCode:    value.ErrorCode,
		ErrorMessage: value.ErrorMessage,
		ReadyAt:      value.ReadyAt,
		CreatedAt:    value.CreatedAt,
		UpdatedAt:    value.UpdatedAt,
	}
}

func optionalInt32(value *int32) *int {
	if value == nil {
		return nil
	}
	converted := int(*value)
	return &converted
}

func invalidAssetRequest(c *gin.Context) {
	respondError(
		c,
		http.StatusBadRequest,
		"invalid_asset",
		"The asset metadata or per-file size is invalid.",
	)
}

func assetUnavailable(c *gin.Context) {
	respondError(
		c,
		http.StatusServiceUnavailable,
		"asset_unavailable",
		"Asset storage is temporarily unavailable.",
	)
}
