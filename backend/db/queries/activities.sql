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

-- name: ListActivityAssets :many
SELECT
    link.activity_id,
    link.asset_id,
    link.role,
    link.position,
    link.alt_text,
    link.caption_id,
    link.caption_en,
    link.label_id,
    link.label_en,
    link.crop,
    link.metadata AS link_metadata,
    asset.kind,
    asset.status,
    asset.original_filename,
    asset.mime_type,
    asset.byte_size,
    asset.width,
    asset.height,
    asset.duration_ms,
    asset.page_count
FROM activity_assets AS link
JOIN media_assets AS asset ON asset.id = link.asset_id
WHERE link.activity_id = sqlc.arg(activity_id)
ORDER BY link.role, link.position;

-- name: GetMediaAssetForActivityLink :one
SELECT id, kind, status
FROM media_assets
WHERE id = sqlc.arg(asset_id);

-- name: DeleteActivityAssets :exec
DELETE FROM activity_assets WHERE activity_id = sqlc.arg(activity_id);

-- name: InsertActivityAsset :exec
INSERT INTO activity_assets (
    activity_id,
    asset_id,
    role,
    position,
    alt_text,
    caption_id,
    caption_en,
    label_id,
    label_en,
    crop,
    metadata
) VALUES (
    sqlc.arg(activity_id),
    sqlc.arg(asset_id),
    sqlc.arg(role),
    sqlc.arg(position),
    sqlc.arg(alt_text),
    sqlc.arg(caption_id),
    sqlc.arg(caption_en),
    sqlc.arg(label_id),
    sqlc.arg(label_en),
    sqlc.narg(crop),
    sqlc.arg(metadata)
);

-- name: ListSlugsWithPrefix :many
SELECT a.slug AS slug
FROM activities AS a
WHERE a.slug LIKE sqlc.arg(pattern)
UNION
SELECT r.slug AS slug
FROM activity_slug_redirects AS r
WHERE r.slug LIKE sqlc.arg(pattern);

-- name: GetActivityIDByRedirectSlug :one
SELECT activity_id
FROM activity_slug_redirects
WHERE slug = sqlc.arg(slug);

-- name: GetPublishedActivityByID :one
SELECT *
FROM activities
WHERE id = sqlc.arg(activity_id)
  AND status = 'published';

-- name: InsertActivitySlugRedirect :exec
INSERT INTO activity_slug_redirects (slug, activity_id)
VALUES (sqlc.arg(slug), sqlc.arg(activity_id))
ON CONFLICT (slug) DO UPDATE SET activity_id = EXCLUDED.activity_id;

-- name: DeleteActivitySlugRedirect :exec
DELETE FROM activity_slug_redirects WHERE slug = sqlc.arg(slug);
