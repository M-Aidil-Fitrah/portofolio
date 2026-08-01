-- +goose Up
-- Delivery comes from derivatives once processing succeeds, so the raw upload expires.
ALTER TABLE media_assets
    ADD COLUMN original_purged_at TIMESTAMPTZ;

-- Documents are excluded: their original is what the download button serves.
CREATE INDEX media_assets_original_retention_idx
    ON media_assets (ready_at)
    WHERE status = 'ready'
      AND kind <> 'document'
      AND original_purged_at IS NULL;

-- +goose Down
DROP INDEX IF EXISTS media_assets_original_retention_idx;
ALTER TABLE media_assets DROP COLUMN IF EXISTS original_purged_at;
