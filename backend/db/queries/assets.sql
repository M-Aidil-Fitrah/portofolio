-- name: CreateMediaAsset :one
INSERT INTO media_assets (
    id,
    kind,
    status,
    original_filename,
    original_object_key,
    mime_type,
    byte_size,
    metadata
) VALUES (
    sqlc.arg(asset_id),
    sqlc.arg(kind),
    'uploading',
    sqlc.arg(original_filename),
    sqlc.arg(original_object_key),
    sqlc.arg(mime_type),
    sqlc.arg(byte_size),
    sqlc.arg(metadata)
)
RETURNING *;

-- name: GetMediaAsset :one
SELECT * FROM media_assets WHERE id = sqlc.arg(asset_id);

-- name: CompleteMediaAssetUpload :one
UPDATE media_assets
SET status = 'queued',
    byte_size = sqlc.arg(byte_size),
    mime_type = sqlc.arg(mime_type),
    metadata = metadata || sqlc.arg(metadata)::JSONB,
    error_code = NULL,
    error_message = NULL,
    updated_at = NOW()
WHERE id = sqlc.arg(asset_id)
  AND status = 'uploading'
RETURNING *;

-- name: CreateProcessingJob :exec
INSERT INTO processing_jobs (
    asset_id,
    job_type,
    idempotency_key
) VALUES (
    sqlc.arg(asset_id),
    sqlc.arg(job_type),
    sqlc.arg(idempotency_key)
)
ON CONFLICT (idempotency_key) DO NOTHING;

-- name: CountActivityAssetLinks :one
SELECT COUNT(*) FROM activity_assets WHERE asset_id = sqlc.arg(asset_id);

-- name: DeleteUnlinkedMediaAsset :execrows
DELETE FROM media_assets AS asset
WHERE asset.id = sqlc.arg(asset_id)
  AND NOT EXISTS (
      SELECT 1
      FROM activity_assets AS link
      WHERE link.asset_id = asset.id
  );
