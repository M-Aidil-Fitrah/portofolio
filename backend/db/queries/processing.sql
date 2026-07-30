-- name: ClaimImageProcessingJob :one
WITH next_job AS (
    SELECT id
    FROM processing_jobs
    WHERE status = 'queued'
      AND job_type = 'image'
      AND run_after <= NOW()
    ORDER BY run_after, created_at
    FOR UPDATE SKIP LOCKED
    LIMIT 1
)
UPDATE processing_jobs AS job
SET status = 'processing',
    attempts = attempts + 1,
    locked_at = NOW(),
    locked_by = sqlc.arg(worker_id),
    heartbeat_at = NOW(),
    updated_at = NOW()
FROM next_job
WHERE job.id = next_job.id
RETURNING job.*;

-- name: RetryStaleProcessingJobs :exec
UPDATE processing_jobs
SET status = 'queued',
    run_after = NOW(),
    locked_at = NULL,
    locked_by = NULL,
    heartbeat_at = NULL,
    last_error = 'worker heartbeat expired',
    updated_at = NOW()
WHERE status = 'processing'
  AND heartbeat_at < sqlc.arg(stale_before)
  AND attempts < max_attempts;

-- name: FailStaleProcessingJobs :exec
WITH exhausted AS (
    UPDATE processing_jobs
    SET status = 'failed',
        locked_at = NULL,
        locked_by = NULL,
        heartbeat_at = NULL,
        last_error = 'worker heartbeat expired after final attempt',
        updated_at = NOW()
    WHERE status = 'processing'
      AND heartbeat_at < sqlc.arg(stale_before)
      AND attempts >= max_attempts
    RETURNING asset_id
)
UPDATE media_assets AS asset
SET status = 'failed',
    error_code = 'worker_timeout',
    error_message = 'Media processing timed out after the final attempt.',
    updated_at = NOW()
FROM exhausted
WHERE asset.id = exhausted.asset_id;

-- name: ClaimVideoProcessingJob :one
WITH next_job AS (
    SELECT id
    FROM processing_jobs
    WHERE status = 'queued'
      AND job_type = 'video'
      AND run_after <= NOW()
    ORDER BY run_after, created_at
    FOR UPDATE SKIP LOCKED
    LIMIT 1
)
UPDATE processing_jobs AS job
SET status = 'processing',
    attempts = attempts + 1,
    locked_at = NOW(),
    locked_by = sqlc.arg(worker_id),
    heartbeat_at = NOW(),
    updated_at = NOW()
FROM next_job
WHERE job.id = next_job.id
RETURNING job.*;

-- name: HeartbeatProcessingJob :execrows
UPDATE processing_jobs
SET heartbeat_at = NOW(),
    updated_at = NOW()
WHERE id = sqlc.arg(job_id)
  AND status = 'processing'
  AND locked_by = sqlc.arg(worker_id);

-- name: CompleteProcessingJob :execrows
UPDATE processing_jobs
SET status = 'completed',
    completed_at = NOW(),
    locked_at = NULL,
    locked_by = NULL,
    heartbeat_at = NULL,
    last_error = NULL,
    updated_at = NOW()
WHERE id = sqlc.arg(job_id)
  AND status = 'processing'
  AND locked_by = sqlc.arg(worker_id);

-- name: RetryProcessingJob :execrows
UPDATE processing_jobs
SET status = 'queued',
    run_after = sqlc.arg(run_after),
    locked_at = NULL,
    locked_by = NULL,
    heartbeat_at = NULL,
    last_error = sqlc.arg(last_error),
    updated_at = NOW()
WHERE id = sqlc.arg(job_id)
  AND status = 'processing'
  AND locked_by = sqlc.arg(worker_id)
  AND attempts < max_attempts;

-- name: FailProcessingJob :execrows
UPDATE processing_jobs
SET status = 'failed',
    locked_at = NULL,
    locked_by = NULL,
    heartbeat_at = NULL,
    last_error = sqlc.arg(last_error),
    updated_at = NOW()
WHERE id = sqlc.arg(job_id)
  AND status = 'processing'
  AND locked_by = sqlc.arg(worker_id);

-- name: StartMediaAssetProcessing :execrows
UPDATE media_assets
SET status = 'processing',
    error_code = NULL,
    error_message = NULL,
    updated_at = NOW()
WHERE id = sqlc.arg(asset_id)
  AND status IN ('queued', 'processing');

-- name: UpsertAssetVariant :one
INSERT INTO asset_variants (
    asset_id,
    variant_key,
    object_key,
    mime_type,
    byte_size,
    width,
    height,
    metadata
) VALUES (
    sqlc.arg(asset_id),
    sqlc.arg(variant_key),
    sqlc.arg(object_key),
    sqlc.arg(mime_type),
    sqlc.arg(byte_size),
    sqlc.narg(width),
    sqlc.narg(height),
    sqlc.arg(metadata)
)
ON CONFLICT (asset_id, variant_key) DO UPDATE
SET object_key = EXCLUDED.object_key,
    mime_type = EXCLUDED.mime_type,
    byte_size = EXCLUDED.byte_size,
    width = EXCLUDED.width,
    height = EXCLUDED.height,
    metadata = EXCLUDED.metadata
RETURNING *;

-- name: MarkImageAssetReady :one
UPDATE media_assets
SET status = 'ready',
    delivery_object_key = sqlc.arg(delivery_object_key),
    mime_type = sqlc.arg(mime_type),
    byte_size = sqlc.arg(byte_size),
    width = sqlc.arg(width),
    height = sqlc.arg(height),
    metadata = metadata || sqlc.arg(metadata)::JSONB,
    error_code = NULL,
    error_message = NULL,
    ready_at = NOW(),
    updated_at = NOW()
WHERE id = sqlc.arg(asset_id)
  AND status = 'processing'
RETURNING *;

-- name: MarkVideoAssetReady :one
UPDATE media_assets
SET status = 'ready',
    delivery_object_key = sqlc.arg(delivery_object_key),
    mime_type = 'video/mp4',
    byte_size = sqlc.arg(byte_size),
    width = sqlc.arg(width),
    height = sqlc.arg(height),
    duration_ms = sqlc.arg(duration_ms),
    metadata = metadata || sqlc.arg(metadata)::JSONB,
    error_code = NULL,
    error_message = NULL,
    ready_at = NOW(),
    updated_at = NOW()
WHERE id = sqlc.arg(asset_id)
  AND status = 'processing'
RETURNING *;

-- name: MarkMediaAssetFailed :exec
UPDATE media_assets
SET status = 'failed',
    error_code = sqlc.arg(error_code),
    error_message = sqlc.arg(error_message),
    updated_at = NOW()
WHERE id = sqlc.arg(asset_id);
