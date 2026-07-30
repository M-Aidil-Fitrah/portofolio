-- name: ListPublicActivities :many
SELECT a.*
FROM activities AS a
WHERE a.status = 'published'
  AND (
    sqlc.arg(search)::TEXT = ''
    OR a.title_id ILIKE '%' || sqlc.arg(search)::TEXT || '%'
    OR a.title_en ILIKE '%' || sqlc.arg(search)::TEXT || '%'
    OR a.caption_id ILIKE '%' || sqlc.arg(search)::TEXT || '%'
    OR a.caption_en ILIKE '%' || sqlc.arg(search)::TEXT || '%'
    OR EXISTS (
        SELECT 1
        FROM activity_tags AS t
        WHERE t.activity_id = a.id
          AND t.value ILIKE '%' || sqlc.arg(search)::TEXT || '%'
    )
  )
  AND (
    sqlc.narg(category)::activity_category IS NULL
    OR a.category = sqlc.narg(category)::activity_category
  )
ORDER BY a.pinned DESC, a.activity_date DESC, a.created_at DESC
LIMIT sqlc.arg(page_limit)
OFFSET sqlc.arg(page_offset);

-- name: CountPublicActivities :one
SELECT COUNT(*)
FROM activities AS a
WHERE a.status = 'published'
  AND (
    sqlc.arg(search)::TEXT = ''
    OR a.title_id ILIKE '%' || sqlc.arg(search)::TEXT || '%'
    OR a.title_en ILIKE '%' || sqlc.arg(search)::TEXT || '%'
    OR a.caption_id ILIKE '%' || sqlc.arg(search)::TEXT || '%'
    OR a.caption_en ILIKE '%' || sqlc.arg(search)::TEXT || '%'
    OR EXISTS (
        SELECT 1
        FROM activity_tags AS t
        WHERE t.activity_id = a.id
          AND t.value ILIKE '%' || sqlc.arg(search)::TEXT || '%'
    )
  )
  AND (
    sqlc.narg(category)::activity_category IS NULL
    OR a.category = sqlc.narg(category)::activity_category
  );

-- name: GetPublishedActivityBySlug :one
SELECT *
FROM activities
WHERE slug = sqlc.arg(slug)
  AND status = 'published';

-- name: ListAdminActivities :many
SELECT *
FROM activities
ORDER BY updated_at DESC, created_at DESC
LIMIT sqlc.arg(page_limit)
OFFSET sqlc.arg(page_offset);

-- name: CountAdminActivities :one
SELECT COUNT(*) FROM activities;

-- name: GetActivityByID :one
SELECT * FROM activities WHERE id = sqlc.arg(activity_id);

-- name: CreateActivity :one
INSERT INTO activities (
    slug,
    title_id,
    title_en,
    caption_id,
    caption_en,
    body_id,
    body_en,
    category,
    activity_date,
    status,
    pinned,
    progress,
    related_project,
    published_at
) VALUES (
    sqlc.narg(slug),
    sqlc.arg(title_id),
    sqlc.arg(title_en),
    sqlc.arg(caption_id),
    sqlc.arg(caption_en),
    sqlc.arg(body_id),
    sqlc.arg(body_en),
    sqlc.arg(category),
    sqlc.arg(activity_date),
    sqlc.arg(status),
    sqlc.arg(pinned),
    sqlc.narg(progress),
    sqlc.narg(related_project),
    CASE
        WHEN sqlc.arg(status)::activity_status = 'published' THEN NOW()
        ELSE NULL
    END
)
RETURNING *;

-- name: UpdateActivity :one
UPDATE activities
SET slug = sqlc.narg(slug),
    title_id = sqlc.arg(title_id),
    title_en = sqlc.arg(title_en),
    caption_id = sqlc.arg(caption_id),
    caption_en = sqlc.arg(caption_en),
    body_id = sqlc.arg(body_id),
    body_en = sqlc.arg(body_en),
    category = sqlc.arg(category),
    activity_date = sqlc.arg(activity_date),
    status = sqlc.arg(status),
    pinned = sqlc.arg(pinned),
    progress = sqlc.narg(progress),
    related_project = sqlc.narg(related_project),
    published_at = CASE
        WHEN sqlc.arg(status)::activity_status = 'published'
            THEN COALESCE(published_at, NOW())
        ELSE NULL
    END,
    version = version + 1,
    updated_at = NOW()
WHERE id = sqlc.arg(activity_id)
  AND version = sqlc.arg(expected_version)
RETURNING *;

-- name: DeleteActivity :execrows
DELETE FROM activities WHERE id = sqlc.arg(activity_id);

-- name: DeleteActivityTags :exec
DELETE FROM activity_tags WHERE activity_id = sqlc.arg(activity_id);

-- name: InsertActivityTag :exec
INSERT INTO activity_tags (activity_id, position, value)
VALUES (
    sqlc.arg(activity_id),
    sqlc.arg(position),
    sqlc.arg(value)
);

-- name: ListActivityTags :many
SELECT *
FROM activity_tags
WHERE activity_id = sqlc.arg(activity_id)
ORDER BY position;
