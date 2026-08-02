package httpapi

import (
	"errors"
	"net/http"
	"strconv"
	"time"

	"github.com/M-Aidil-Fitrah/portofolio/backend/internal/contract"
	"github.com/M-Aidil-Fitrah/portofolio/backend/internal/engagement"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

const visitorCookieName = "portfolio_visitor"

func (s *server) GetActivityEngagement(
	c *gin.Context,
	slug contract.ActivitySlug,
	params contract.GetActivityEngagementParams,
) {
	if s.engagement == nil {
		engagementUnavailable(c)
		return
	}
	visitorID := visitorIdentity(c)
	limit, offset := engagementPage(params.Limit, params.Offset)
	value, err := s.engagement.Get(
		c.Request.Context(),
		slug,
		visitorID,
		limit,
		offset,
	)
	if err != nil {
		s.respondEngagementError(c, err)
		return
	}
	c.JSON(http.StatusOK, engagementResponse(value))
}

func (s *server) SetActivityLike(
	c *gin.Context,
	slug contract.ActivitySlug,
) {
	if !s.requireWebOrigin(c) {
		return
	}
	if s.engagement == nil {
		engagementUnavailable(c)
		return
	}
	visitorID := visitorIdentity(c)
	if allowed, retry := s.likeRate.allow(visitorID); !allowed {
		respondRateLimited(c, retry)
		return
	}
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, 4<<10)
	var request contract.SetLikeRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		invalidEngagementRequest(c)
		return
	}
	count, err := s.engagement.SetLike(
		c.Request.Context(),
		slug,
		visitorID,
		request.Liked,
	)
	if err != nil {
		s.respondEngagementError(c, err)
		return
	}
	c.JSON(http.StatusOK, contract.LikeState{
		Liked: request.Liked,
		Likes: count,
	})
}

func (s *server) CreateActivityComment(
	c *gin.Context,
	slug contract.ActivitySlug,
) {
	if !s.requireWebOrigin(c) {
		return
	}
	if s.engagement == nil {
		engagementUnavailable(c)
		return
	}
	visitorID := visitorIdentity(c)
	if allowed, retry := s.commentRate.allow(visitorID); !allowed {
		respondRateLimited(c, retry)
		return
	}
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, 16<<10)
	var request contract.CreateCommentRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		invalidEngagementRequest(c)
		return
	}
	value, err := s.engagement.CreateComment(
		c.Request.Context(),
		slug,
		request.Author,
		request.Body,
	)
	if err != nil {
		s.respondEngagementError(c, err)
		return
	}
	c.JSON(http.StatusCreated, commentResponse(value))
}

func (s *server) ListAdminComments(
	c *gin.Context,
	params contract.ListAdminCommentsParams,
) {
	if !s.requireAdmin(c) {
		return
	}
	if s.engagement == nil {
		engagementUnavailable(c)
		return
	}
	limit, offset := engagementPage(params.Limit, params.Offset)
	var activityID, status *string
	if params.ActivityID != nil {
		value := params.ActivityID.String()
		activityID = &value
	}
	if params.Status != nil {
		value := string(*params.Status)
		status = &value
	}
	value, err := s.engagement.ListAdmin(
		c.Request.Context(),
		activityID,
		status,
		limit,
		offset,
	)
	if err != nil {
		s.respondEngagementError(c, err)
		return
	}
	items := make([]contract.ActivityComment, 0, len(value.Items))
	for _, item := range value.Items {
		items = append(items, commentResponse(item))
	}
	c.JSON(http.StatusOK, contract.AdminCommentList{
		Items:  items,
		Total:  value.Total,
		Limit:  int(value.Limit),
		Offset: int(value.Offset),
	})
}

func (s *server) ModerateAdminComment(
	c *gin.Context,
	commentID contract.CommentID,
) {
	if !s.requireWebOrigin(c) || !s.requireAdmin(c) {
		return
	}
	if s.engagement == nil {
		engagementUnavailable(c)
		return
	}
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, 4<<10)
	var request contract.ModerateCommentRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		invalidEngagementRequest(c)
		return
	}
	value, err := s.engagement.Moderate(
		c.Request.Context(),
		commentID.String(),
		string(request.Status),
	)
	if err != nil {
		s.respondEngagementError(c, err)
		return
	}
	c.JSON(http.StatusOK, commentResponse(value))
}

func (s *server) DeleteAdminComment(
	c *gin.Context,
	commentID contract.CommentID,
) {
	if !s.requireWebOrigin(c) || !s.requireAdmin(c) {
		return
	}
	if s.engagement == nil {
		engagementUnavailable(c)
		return
	}
	if err := s.engagement.Delete(
		c.Request.Context(),
		commentID.String(),
	); err != nil {
		s.respondEngagementError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

func visitorIdentity(c *gin.Context) string {
	if value, err := c.Cookie(visitorCookieName); err == nil {
		if _, err := uuid.Parse(value); err == nil {
			return value
		}
	}
	value := uuid.NewString()
	http.SetCookie(c.Writer, &http.Cookie{
		Name: visitorCookieName, Value: value,
		Path: "/", MaxAge: 365 * 24 * 60 * 60,
		HttpOnly: true, Secure: true, SameSite: http.SameSiteLaxMode,
	})
	return value
}

func engagementPage(
	limit *contract.Limit,
	offset *contract.Offset,
) (int32, int32) {
	resultLimit, resultOffset := int32(20), int32(0)
	if limit != nil {
		resultLimit = int32(*limit)
	}
	if offset != nil {
		resultOffset = int32(*offset)
	}
	return resultLimit, resultOffset
}

func engagementResponse(value engagement.Snapshot) contract.EngagementSnapshot {
	comments := make([]contract.ActivityComment, 0, len(value.Comments))
	for _, item := range value.Comments {
		comments = append(comments, commentResponse(item))
	}
	return contract.EngagementSnapshot{
		Likes: value.Likes, Liked: value.Liked,
		Comments: comments, CommentTotal: value.CommentTotal,
		CommentLimit:  int(value.CommentLimit),
		CommentOffset: int(value.CommentOffset),
	}
}

func commentResponse(value engagement.Comment) contract.ActivityComment {
	return contract.ActivityComment{
		ID:           uuid.MustParse(value.ID),
		ActivityID:   uuid.MustParse(value.ActivityID),
		ActivitySlug: value.ActivitySlug,
		Author:       value.Author, Body: value.Body,
		Status:    contract.CommentStatus(value.Status),
		CreatedAt: value.CreatedAt, UpdatedAt: value.UpdatedAt,
	}
}

func (s *server) respondEngagementError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, engagement.ErrInvalid):
		invalidEngagementRequest(c)
	case errors.Is(err, engagement.ErrNotFound):
		respondError(
			c,
			http.StatusNotFound,
			"engagement_not_found",
			"The activity or comment was not found.",
		)
	default:
		respondError(
			c,
			http.StatusInternalServerError,
			"internal_error",
			"The engagement request could not be completed.",
		)
	}
}

func respondRateLimited(c *gin.Context, retry time.Duration) {
	c.Header("Retry-After", strconv.Itoa(max(1, int(retry.Seconds()))))
	respondError(
		c,
		http.StatusTooManyRequests,
		"rate_limited",
		"Too many requests. Try again shortly.",
	)
}

func invalidEngagementRequest(c *gin.Context) {
	respondError(
		c,
		http.StatusBadRequest,
		"invalid_engagement",
		"The engagement request is invalid.",
	)
}

func engagementUnavailable(c *gin.Context) {
	respondError(
		c,
		http.StatusServiceUnavailable,
		"engagement_unavailable",
		"Engagement is temporarily unavailable.",
	)
}
