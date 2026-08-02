package engagement

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/M-Aidil-Fitrah/portofolio/backend/internal/database/dbgen"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	ErrInvalid  = errors.New("invalid engagement")
	ErrNotFound = errors.New("engagement resource not found")
)

type Comment struct {
	ID           string
	ActivityID   string
	ActivitySlug *string
	Author       string
	Body         string
	Status       string
	CreatedAt    time.Time
	UpdatedAt    time.Time
}

type Snapshot struct {
	Likes         int64
	Liked         bool
	Comments      []Comment
	CommentTotal  int64
	CommentLimit  int32
	CommentOffset int32
}

type AdminCommentList struct {
	Items  []Comment
	Total  int64
	Limit  int32
	Offset int32
}

type Service struct {
	pool    *pgxpool.Pool
	queries *dbgen.Queries
}

func NewService(pool *pgxpool.Pool) *Service {
	return &Service{pool: pool, queries: dbgen.New(pool)}
}

func (s *Service) Get(
	ctx context.Context,
	slug string,
	visitorID string,
	limit int32,
	offset int32,
) (Snapshot, error) {
	activityID, visitor, err := s.identities(ctx, slug, visitorID)
	if err != nil {
		return Snapshot{}, err
	}
	limit, offset = normalizePage(limit, offset)
	likes, err := s.queries.CountActivityLikes(ctx, activityID)
	if err != nil {
		return Snapshot{}, fmt.Errorf("count activity likes: %w", err)
	}
	liked, err := s.queries.HasActivityLike(
		ctx,
		dbgen.HasActivityLikeParams{
			ActivityID: activityID,
			VisitorID:  visitor,
		},
	)
	if err != nil {
		return Snapshot{}, fmt.Errorf("read activity like: %w", err)
	}
	rows, err := s.queries.ListVisibleActivityComments(
		ctx,
		dbgen.ListVisibleActivityCommentsParams{
			ActivityID: activityID,
			PageLimit:  limit,
			PageOffset: offset,
		},
	)
	if err != nil {
		return Snapshot{}, fmt.Errorf("list comments: %w", err)
	}
	total, err := s.queries.CountVisibleActivityComments(ctx, activityID)
	if err != nil {
		return Snapshot{}, fmt.Errorf("count comments: %w", err)
	}
	return Snapshot{
		Likes: likes, Liked: liked,
		Comments:     mapComments(rows),
		CommentTotal: total, CommentLimit: limit, CommentOffset: offset,
	}, nil
}

func (s *Service) SetLike(
	ctx context.Context,
	slug string,
	visitorID string,
	liked bool,
) (int64, error) {
	activityID, visitor, err := s.identities(ctx, slug, visitorID)
	if err != nil {
		return 0, err
	}
	if liked {
		err = s.queries.AddActivityLike(
			ctx,
			dbgen.AddActivityLikeParams{
				ActivityID: activityID, VisitorID: visitor,
			},
		)
	} else {
		err = s.queries.RemoveActivityLike(
			ctx,
			dbgen.RemoveActivityLikeParams{
				ActivityID: activityID, VisitorID: visitor,
			},
		)
	}
	if err != nil {
		return 0, fmt.Errorf("set activity like: %w", err)
	}
	count, err := s.queries.CountActivityLikes(ctx, activityID)
	if err != nil {
		return 0, fmt.Errorf("count activity likes: %w", err)
	}
	return count, nil
}

func (s *Service) CreateComment(
	ctx context.Context,
	slug string,
	author string,
	body string,
) (Comment, error) {
	author = strings.TrimSpace(author)
	body = strings.TrimSpace(body)
	if author == "" || len([]rune(author)) > 80 ||
		body == "" || len([]rune(body)) > 2000 {
		return Comment{}, ErrInvalid
	}
	activityID, err := s.activityID(ctx, slug)
	if err != nil {
		return Comment{}, err
	}
	value, err := s.queries.CreateActivityComment(
		ctx,
		dbgen.CreateActivityCommentParams{
			ActivityID: activityID,
			AuthorName: author,
			Body:       body,
		},
	)
	if err != nil {
		return Comment{}, fmt.Errorf("create activity comment: %w", err)
	}
	return mapComment(value), nil
}

func (s *Service) ListAdmin(
	ctx context.Context,
	activityID *string,
	status *string,
	limit int32,
	offset int32,
) (AdminCommentList, error) {
	limit, offset = normalizePage(limit, offset)
	var parsedActivity pgtype.UUID
	var err error
	if activityID != nil {
		parsedActivity, err = parseUUID(*activityID)
		if err != nil {
			return AdminCommentList{}, ErrInvalid
		}
	}
	var parsedStatus *dbgen.CommentStatus
	if status != nil {
		value := dbgen.CommentStatus(strings.TrimSpace(*status))
		if value != dbgen.CommentStatusVisible &&
			value != dbgen.CommentStatusHidden {
			return AdminCommentList{}, ErrInvalid
		}
		parsedStatus = &value
	}
	params := dbgen.ListAdminCommentsParams{
		ActivityID: parsedActivity, CommentStatus: parsedStatus,
		PageLimit: limit, PageOffset: offset,
	}
	rows, err := s.queries.ListAdminComments(ctx, params)
	if err != nil {
		return AdminCommentList{}, fmt.Errorf("list admin comments: %w", err)
	}
	total, err := s.queries.CountAdminComments(
		ctx,
		dbgen.CountAdminCommentsParams{
			ActivityID: parsedActivity, CommentStatus: parsedStatus,
		},
	)
	if err != nil {
		return AdminCommentList{}, fmt.Errorf("count admin comments: %w", err)
	}
	items := make([]Comment, 0, len(rows))
	for _, row := range rows {
		comment := Comment{
			ID:           uuid.UUID(row.ID.Bytes).String(),
			ActivityID:   uuid.UUID(row.ActivityID.Bytes).String(),
			ActivitySlug: row.ActivitySlug,
			Author:       row.AuthorName, Body: row.Body,
			Status:    string(row.Status),
			CreatedAt: row.CreatedAt.Time, UpdatedAt: row.UpdatedAt.Time,
		}
		items = append(items, comment)
	}
	return AdminCommentList{
		Items: items, Total: total, Limit: limit, Offset: offset,
	}, nil
}

func (s *Service) Moderate(
	ctx context.Context,
	id string,
	status string,
) (Comment, error) {
	commentID, err := parseUUID(id)
	if err != nil {
		return Comment{}, ErrInvalid
	}
	value := dbgen.CommentStatus(strings.TrimSpace(status))
	if value != dbgen.CommentStatusVisible &&
		value != dbgen.CommentStatusHidden {
		return Comment{}, ErrInvalid
	}
	row, err := s.queries.UpdateCommentStatus(
		ctx,
		dbgen.UpdateCommentStatusParams{
			CommentID: commentID, CommentStatus: value,
		},
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return Comment{}, ErrNotFound
	}
	if err != nil {
		return Comment{}, fmt.Errorf("moderate comment: %w", err)
	}
	return mapComment(row), nil
}

func (s *Service) Delete(ctx context.Context, id string) error {
	commentID, err := parseUUID(id)
	if err != nil {
		return ErrInvalid
	}
	deleted, err := s.queries.DeleteComment(ctx, commentID)
	if err != nil {
		return fmt.Errorf("delete comment: %w", err)
	}
	if deleted == 0 {
		return ErrNotFound
	}
	return nil
}

func (s *Service) identities(
	ctx context.Context,
	slug string,
	visitorID string,
) (pgtype.UUID, pgtype.UUID, error) {
	activityID, err := s.activityID(ctx, slug)
	if err != nil {
		return pgtype.UUID{}, pgtype.UUID{}, err
	}
	visitor, err := parseUUID(visitorID)
	if err != nil {
		return pgtype.UUID{}, pgtype.UUID{}, ErrInvalid
	}
	return activityID, visitor, nil
}

func (s *Service) activityID(
	ctx context.Context,
	slug string,
) (pgtype.UUID, error) {
	slug = strings.TrimSpace(slug)
	if slug == "" {
		return pgtype.UUID{}, ErrInvalid
	}
	activityID, err := s.queries.GetPublishedActivityIDBySlug(ctx, &slug)
	if errors.Is(err, pgx.ErrNoRows) {
		return pgtype.UUID{}, ErrNotFound
	}
	if err != nil {
		return pgtype.UUID{}, fmt.Errorf("get published activity: %w", err)
	}
	return activityID, nil
}

func parseUUID(value string) (pgtype.UUID, error) {
	var parsed pgtype.UUID
	if err := parsed.Scan(value); err != nil {
		return pgtype.UUID{}, err
	}
	return parsed, nil
}

func normalizePage(limit, offset int32) (int32, int32) {
	if limit <= 0 || limit > 50 {
		limit = 20
	}
	if offset < 0 {
		offset = 0
	}
	return limit, offset
}

func mapComments(rows []dbgen.ActivityComment) []Comment {
	items := make([]Comment, 0, len(rows))
	for _, row := range rows {
		items = append(items, mapComment(row))
	}
	return items
}

func mapComment(row dbgen.ActivityComment) Comment {
	return Comment{
		ID:         uuid.UUID(row.ID.Bytes).String(),
		ActivityID: uuid.UUID(row.ActivityID.Bytes).String(),
		Author:     row.AuthorName, Body: row.Body,
		Status:    string(row.Status),
		CreatedAt: row.CreatedAt.Time, UpdatedAt: row.UpdatedAt.Time,
	}
}
