package httpapi

import (
	"errors"
	"net/http"
	"strings"

	"github.com/M-Aidil-Fitrah/portofolio/backend/internal/activity"
	"github.com/M-Aidil-Fitrah/portofolio/backend/internal/contract"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	openapi_types "github.com/oapi-codegen/runtime/types"
)

func (s *server) ListPublicActivities(
	c *gin.Context,
	params contract.ListPublicActivitiesParams,
) {
	if s.activities == nil {
		activityUnavailable(c)
		return
	}
	options, ok := publicListOptions(params)
	if !ok {
		invalidActivityRequest(c)
		return
	}
	result, err := s.activities.ListPublic(c.Request.Context(), options)
	if err != nil {
		s.respondActivityError(c, err)
		return
	}
	c.JSON(http.StatusOK, activityListResponse(result, false))
}

func (s *server) GetPublicActivity(
	c *gin.Context,
	slug contract.ActivitySlug,
) {
	if s.activities == nil {
		activityUnavailable(c)
		return
	}
	item, err := s.activities.GetPublic(c.Request.Context(), slug)
	if err != nil {
		s.respondActivityError(c, err)
		return
	}
	c.JSON(http.StatusOK, activityResponse(item, false))
}

func (s *server) ListAdminActivities(
	c *gin.Context,
	params contract.ListAdminActivitiesParams,
) {
	if !s.requireAdmin(c) {
		return
	}
	if s.activities == nil {
		activityUnavailable(c)
		return
	}
	options, ok := adminListOptions(params)
	if !ok {
		invalidActivityRequest(c)
		return
	}
	result, err := s.activities.ListAdmin(c.Request.Context(), options)
	if err != nil {
		s.respondActivityError(c, err)
		return
	}
	c.JSON(http.StatusOK, activityListResponse(result, true))
}

func (s *server) GetAdminActivity(
	c *gin.Context,
	id contract.ActivityID,
) {
	if !s.requireAdmin(c) {
		return
	}
	if s.activities == nil {
		activityUnavailable(c)
		return
	}
	item, err := s.activities.GetAdmin(c.Request.Context(), id.String())
	if err != nil {
		s.respondActivityError(c, err)
		return
	}
	c.JSON(http.StatusOK, activityResponse(item, true))
}

func (s *server) CreateAdminActivity(c *gin.Context) {
	if !s.requireWebOrigin(c) || !s.requireAdmin(c) {
		return
	}
	if s.activities == nil {
		activityUnavailable(c)
		return
	}
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, 1<<20)
	var request contract.CreateActivityRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		invalidActivityRequest(c)
		return
	}
	item, err := s.activities.Create(
		c.Request.Context(),
		writeInput(request, 0),
	)
	if err != nil {
		s.respondActivityError(c, err)
		return
	}
	c.JSON(http.StatusCreated, activityResponse(item, true))
}

func (s *server) UpdateAdminActivity(
	c *gin.Context,
	id contract.ActivityID,
) {
	if !s.requireWebOrigin(c) || !s.requireAdmin(c) {
		return
	}
	if s.activities == nil {
		activityUnavailable(c)
		return
	}
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, 1<<20)
	var request contract.UpdateActivityRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		invalidActivityRequest(c)
		return
	}
	item, err := s.activities.Update(
		c.Request.Context(),
		id.String(),
		writeInput(
			contract.ActivityWrite{
				Assets:         request.Assets,
				Body:           request.Body,
				Caption:        request.Caption,
				Category:       request.Category,
				Date:           request.Date,
				Pinned:         request.Pinned,
				Progress:       request.Progress,
				RelatedProject: request.RelatedProject,
				Slug:           request.Slug,
				Status:         request.Status,
				Tags:           request.Tags,
				Title:          request.Title,
			},
			request.Version,
		),
	)
	if err != nil {
		s.respondActivityError(c, err)
		return
	}
	c.JSON(http.StatusOK, activityResponse(item, true))
}

func (s *server) DeleteAdminActivity(
	c *gin.Context,
	id contract.ActivityID,
) {
	if !s.requireWebOrigin(c) || !s.requireAdmin(c) {
		return
	}
	if s.activities == nil {
		activityUnavailable(c)
		return
	}
	if err := s.activities.Delete(
		c.Request.Context(),
		id.String(),
	); err != nil {
		s.respondActivityError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

func (s *server) requireAdmin(c *gin.Context) bool {
	if s.auth == nil {
		respondError(
			c,
			http.StatusUnauthorized,
			"invalid_session",
			"The administrator session is no longer valid.",
		)
		return false
	}
	accessToken, err := c.Cookie(accessCookieName)
	if err != nil {
		respondError(
			c,
			http.StatusUnauthorized,
			"invalid_session",
			"The administrator session is no longer valid.",
		)
		return false
	}
	if _, err := s.auth.Authenticate(
		c.Request.Context(),
		accessToken,
	); err != nil {
		if isSessionError(err) {
			respondError(
				c,
				http.StatusUnauthorized,
				"invalid_session",
				"The administrator session is no longer valid.",
			)
		} else {
			respondError(
				c,
				http.StatusInternalServerError,
				"internal_error",
				"The administrator session could not be verified.",
			)
		}
		return false
	}
	return true
}

func (s *server) respondActivityError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, activity.ErrInvalid):
		invalidActivityRequest(c)
	case errors.Is(err, activity.ErrNotFound):
		respondError(
			c,
			http.StatusNotFound,
			"activity_not_found",
			"The requested activity was not found.",
		)
	case errors.Is(err, activity.ErrConflict):
		respondError(
			c,
			http.StatusConflict,
			"activity_conflict",
			"The activity changed or its slug is already in use.",
		)
	default:
		respondError(
			c,
			http.StatusInternalServerError,
			"internal_error",
			"The activity request could not be completed.",
		)
	}
}

func publicListOptions(
	params contract.ListPublicActivitiesParams,
) (activity.ListOptions, bool) {
	options, ok := listOptions(params.Limit, params.Offset)
	if !ok {
		return activity.ListOptions{}, false
	}
	if params.Search != nil {
		options.Search = strings.TrimSpace(*params.Search)
		if len(options.Search) > 120 {
			return activity.ListOptions{}, false
		}
	}
	if params.Category != nil {
		if !params.Category.Valid() {
			return activity.ListOptions{}, false
		}
		value := string(*params.Category)
		options.Category = &value
	}
	return options, true
}

func adminListOptions(
	params contract.ListAdminActivitiesParams,
) (activity.ListOptions, bool) {
	return listOptions(params.Limit, params.Offset)
}

func listOptions(
	limit *contract.Limit,
	offset *contract.Offset,
) (activity.ListOptions, bool) {
	result := activity.ListOptions{Limit: 20}
	if limit != nil {
		if *limit < 1 || *limit > 50 {
			return activity.ListOptions{}, false
		}
		result.Limit = int32(*limit)
	}
	if offset != nil {
		if *offset < 0 {
			return activity.ListOptions{}, false
		}
		result.Offset = int32(*offset)
	}
	return result, true
}

func writeInput(
	request contract.ActivityWrite,
	version int64,
) activity.WriteInput {
	var progress *string
	if request.Progress != nil {
		value := string(*request.Progress)
		progress = &value
	}
	assets := make([]activity.AssetInput, 0, len(request.Assets))
	for _, asset := range request.Assets {
		assets = append(assets, activity.AssetInput{
			ID:       asset.AssetID.String(),
			Role:     string(asset.Role),
			Position: int32(asset.Position),
			Alt:      asset.Alt,
			Caption: activity.LocalizedText{
				ID: asset.Caption.ID,
				EN: asset.Caption.En,
			},
			Label: activity.LocalizedText{
				ID: asset.Label.ID,
				EN: asset.Label.En,
			},
			Crop:     copyObject(asset.Crop),
			Metadata: copyObject(asset.Metadata),
		})
	}
	return activity.WriteInput{
		Slug: request.Slug,
		Title: activity.LocalizedText{
			ID: request.Title.ID,
			EN: request.Title.En,
		},
		Caption: activity.LocalizedText{
			ID: request.Caption.ID,
			EN: request.Caption.En,
		},
		Body: activity.LocalizedText{
			ID: request.Body.ID,
			EN: request.Body.En,
		},
		Category:       string(request.Category),
		Date:           request.Date.Time,
		Tags:           request.Tags,
		Assets:         assets,
		Status:         string(request.Status),
		Pinned:         request.Pinned,
		Progress:       progress,
		RelatedProject: request.RelatedProject,
		Version:        version,
	}
}

func activityListResponse(
	result activity.ListResult,
	admin bool,
) contract.ActivityList {
	items := make([]contract.Activity, 0, len(result.Items))
	for _, item := range result.Items {
		items = append(items, activityResponse(item, admin))
	}
	return contract.ActivityList{
		Items:  items,
		Limit:  int(result.Limit),
		Offset: int(result.Offset),
		Total:  result.Total,
	}
}

func activityResponse(
	item activity.Activity,
	admin bool,
) contract.Activity {
	var progress *contract.ActivityProgress
	if item.Progress != nil {
		value := contract.ActivityProgress(*item.Progress)
		progress = &value
	}
	assets := make([]contract.ActivityAsset, 0, len(item.Assets))
	for _, asset := range item.Assets {
		value := contract.ActivityAsset{
			Alt:      asset.Alt,
			AssetID:  uuid.MustParse(asset.ID),
			ByteSize: asset.ByteSize,
			Caption: contract.LocalizedText{
				ID: asset.Caption.ID,
				En: asset.Caption.EN,
			},
			Filename: asset.Filename,
			Kind:     contract.MediaKind(asset.Kind),
			Label: contract.LocalizedText{
				ID: asset.Label.ID,
				En: asset.Label.EN,
			},
			MimeType: asset.MimeType,
			Position: int(asset.Position),
			Role:     contract.ActivityAssetRole(asset.Role),
			Status:   contract.AssetStatus(asset.Status),
			Crop:     objectPointer(asset.Crop),
			Metadata: objectPointer(asset.Metadata),
		}
		if asset.Width != nil {
			width := int(*asset.Width)
			value.Width = &width
		}
		if asset.Height != nil {
			height := int(*asset.Height)
			value.Height = &height
		}
		if asset.DurationMS != nil {
			value.DurationMs = asset.DurationMS
		}
		if asset.PageCount != nil {
			pageCount := int(*asset.PageCount)
			value.PageCount = &pageCount
		}
		if asset.Status == "ready" {
			switch asset.Kind {
			case "image":
				value.Src = stringPointer(
					assetContentURL(asset.ID, "delivery", admin),
				)
			case "video":
				value.Src = stringPointer(
					assetContentURL(asset.ID, "delivery", admin),
				)
				value.PosterSrc = stringPointer(
					assetContentURL(asset.ID, "poster", admin),
				)
			case "document":
				value.PreviewSrc = stringPointer(
					assetContentURL(asset.ID, "delivery", admin),
				)
				value.ThumbnailSrc = stringPointer(
					assetContentURL(asset.ID, "thumbnail", admin),
				)
				value.DownloadSrc = stringPointer(
					assetContentURL(asset.ID, "download", admin),
				)
			}
		}
		assets = append(assets, value)
	}
	return contract.Activity{
		Assets: assets,
		Body: contract.LocalizedText{
			ID: item.Body.ID,
			En: item.Body.EN,
		},
		Caption: contract.LocalizedText{
			ID: item.Caption.ID,
			En: item.Caption.EN,
		},
		Category:       contract.ActivityCategory(item.Category),
		CreatedAt:      item.CreatedAt,
		Date:           openapi_types.Date{Time: item.Date},
		ID:             uuid.MustParse(item.ID),
		Pinned:         item.Pinned,
		Progress:       progress,
		RelatedProject: item.RelatedProject,
		Slug:           item.Slug,
		Status:         contract.ActivityStatus(item.Status),
		Tags:           item.Tags,
		Title: contract.LocalizedText{
			ID: item.Title.ID,
			En: item.Title.EN,
		},
		UpdatedAt: item.UpdatedAt,
		Version:   item.Version,
	}
}

// Admin assets may not be publicly linked yet, so point at the streaming route.
func assetContentURL(id, variant string, admin bool) string {
	prefix := "/api/v1/assets/"
	if admin {
		prefix = "/api/v1/admin/assets/"
	}
	return prefix + id + "/content?variant=" + variant
}

func stringPointer(value string) *string {
	return &value
}

func copyObject(value *map[string]interface{}) map[string]any {
	if value == nil {
		return nil
	}
	result := make(map[string]any, len(*value))
	for key, item := range *value {
		result[key] = item
	}
	return result
}

func objectPointer(value map[string]any) *map[string]interface{} {
	if value == nil {
		return nil
	}
	result := make(map[string]interface{}, len(value))
	for key, item := range value {
		result[key] = item
	}
	return &result
}

func invalidActivityRequest(c *gin.Context) {
	respondError(
		c,
		http.StatusBadRequest,
		"invalid_activity",
		"The activity payload or query parameters are invalid.",
	)
}

func activityUnavailable(c *gin.Context) {
	respondError(
		c,
		http.StatusServiceUnavailable,
		"activities_unavailable",
		"Activities are temporarily unavailable.",
	)
}
