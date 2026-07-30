-- name: GetPublishedActivityIDBySlug :one
SELECT id
FROM activities
WHERE slug = sqlc.arg(slug)
  AND status = 'published';

-- name: CountActivityLikes :one
SELECT COUNT(*) FROM activity_likes WHERE activity_id = sqlc.arg(activity_id);

-- name: HasActivityLike :one
SELECT EXISTS (
    SELECT 1
    FROM activity_likes
    WHERE activity_id = sqlc.arg(activity_id)
      AND visitor_id = sqlc.arg(visitor_id)
);

-- name: AddActivityLike :exec
INSERT INTO activity_likes (activity_id, visitor_id)
VALUES (sqlc.arg(activity_id), sqlc.arg(visitor_id))
ON CONFLICT DO NOTHING;

-- name: RemoveActivityLike :exec
DELETE FROM activity_likes
WHERE activity_id = sqlc.arg(activity_id)
  AND visitor_id = sqlc.arg(visitor_id);

-- name: ListVisibleActivityComments :many
SELECT *
FROM activity_comments
WHERE activity_id = sqlc.arg(activity_id)
  AND status = 'visible'
ORDER BY created_at DESC, id DESC
LIMIT sqlc.arg(page_limit)
OFFSET sqlc.arg(page_offset);

-- name: CountVisibleActivityComments :one
SELECT COUNT(*)
FROM activity_comments
WHERE activity_id = sqlc.arg(activity_id)
  AND status = 'visible';

-- name: CreateActivityComment :one
INSERT INTO activity_comments (
    activity_id,
    author_name,
    body
) VALUES (
    sqlc.arg(activity_id),
    sqlc.arg(author_name),
    sqlc.arg(body)
)
RETURNING *;

-- name: ListAdminComments :many
SELECT comment.*, activity.slug AS activity_slug
FROM activity_comments AS comment
JOIN activities AS activity ON activity.id = comment.activity_id
WHERE (
    sqlc.narg(activity_id)::UUID IS NULL
    OR comment.activity_id = sqlc.narg(activity_id)
)
  AND (
    sqlc.narg(comment_status)::comment_status IS NULL
    OR comment.status = sqlc.narg(comment_status)::comment_status
  )
ORDER BY comment.created_at DESC, comment.id DESC
LIMIT sqlc.arg(page_limit)
OFFSET sqlc.arg(page_offset);

-- name: CountAdminComments :one
SELECT COUNT(*)
FROM activity_comments AS comment
WHERE (
    sqlc.narg(activity_id)::UUID IS NULL
    OR comment.activity_id = sqlc.narg(activity_id)
)
  AND (
    sqlc.narg(comment_status)::comment_status IS NULL
    OR comment.status = sqlc.narg(comment_status)::comment_status
  );

-- name: UpdateCommentStatus :one
UPDATE activity_comments
SET status = sqlc.arg(comment_status),
    updated_at = NOW()
WHERE id = sqlc.arg(comment_id)
RETURNING *;

-- name: DeleteComment :execrows
DELETE FROM activity_comments WHERE id = sqlc.arg(comment_id);
