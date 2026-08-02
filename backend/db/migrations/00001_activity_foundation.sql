-- +goose Up
CREATE TYPE activity_category AS ENUM (
    'project',
    'learning',
    'daily',
    'achievement'
);

CREATE TYPE activity_status AS ENUM (
    'published',
    'draft',
    'hidden'
);

CREATE TYPE activity_progress AS ENUM (
    'learning',
    'shipped',
    'exploring'
);

CREATE TYPE media_kind AS ENUM (
    'image',
    'video',
    'document'
);

CREATE TYPE asset_status AS ENUM (
    'queued',
    'uploading',
    'processing',
    'ready',
    'failed'
);

CREATE TYPE activity_asset_role AS ENUM (
    'cover',
    'gallery',
    'attachment'
);

CREATE TYPE processing_job_type AS ENUM (
    'image',
    'video',
    'document'
);

CREATE TYPE processing_job_status AS ENUM (
    'queued',
    'processing',
    'completed',
    'failed'
);

CREATE TABLE activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(72) UNIQUE,
    title_id TEXT NOT NULL,
    title_en TEXT NOT NULL,
    caption_id TEXT NOT NULL DEFAULT '',
    caption_en TEXT NOT NULL DEFAULT '',
    body_id TEXT NOT NULL DEFAULT '',
    body_en TEXT NOT NULL DEFAULT '',
    category activity_category NOT NULL,
    activity_date DATE NOT NULL,
    status activity_status NOT NULL DEFAULT 'draft',
    pinned BOOLEAN NOT NULL DEFAULT FALSE,
    progress activity_progress,
    related_project TEXT,
    published_at TIMESTAMPTZ,
    version BIGINT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT activities_slug_format
        CHECK (
            slug IS NULL
            OR slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
        ),
    CONSTRAINT activities_published_slug_required
        CHECK (status <> 'published' OR slug IS NOT NULL),
    CONSTRAINT activities_version_positive CHECK (version > 0)
);

CREATE INDEX activities_public_feed_idx
    ON activities (pinned DESC, activity_date DESC, created_at DESC)
    WHERE status = 'published';

CREATE TABLE activity_tags (
    activity_id UUID NOT NULL
        REFERENCES activities (id) ON DELETE CASCADE,
    position INTEGER NOT NULL,
    value TEXT NOT NULL,
    PRIMARY KEY (activity_id, position),
    CONSTRAINT activity_tags_position_nonnegative CHECK (position >= 0),
    CONSTRAINT activity_tags_value_not_blank CHECK (BTRIM(value) <> '')
);

CREATE TABLE media_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kind media_kind NOT NULL,
    status asset_status NOT NULL DEFAULT 'queued',
    original_filename TEXT NOT NULL,
    original_object_key TEXT NOT NULL UNIQUE,
    delivery_object_key TEXT UNIQUE,
    mime_type TEXT NOT NULL,
    byte_size BIGINT NOT NULL,
    checksum_sha256 CHAR(64),
    width INTEGER,
    height INTEGER,
    duration_ms BIGINT,
    page_count INTEGER,
    metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
    error_code TEXT,
    error_message TEXT,
    ready_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT media_assets_filename_not_blank
        CHECK (BTRIM(original_filename) <> ''),
    CONSTRAINT media_assets_object_key_not_blank
        CHECK (BTRIM(original_object_key) <> ''),
    CONSTRAINT media_assets_mime_type_not_blank CHECK (BTRIM(mime_type) <> ''),
    CONSTRAINT media_assets_byte_size_nonnegative CHECK (byte_size >= 0),
    CONSTRAINT media_assets_width_positive CHECK (width IS NULL OR width > 0),
    CONSTRAINT media_assets_height_positive CHECK (height IS NULL OR height > 0),
    CONSTRAINT media_assets_duration_nonnegative
        CHECK (duration_ms IS NULL OR duration_ms >= 0),
    CONSTRAINT media_assets_page_count_positive
        CHECK (page_count IS NULL OR page_count > 0),
    CONSTRAINT media_assets_checksum_format
        CHECK (
            checksum_sha256 IS NULL
            OR checksum_sha256 ~ '^[0-9a-f]{64}$'
        ),
    CONSTRAINT media_assets_metadata_object
        CHECK (JSONB_TYPEOF(metadata) = 'object')
);

CREATE INDEX media_assets_processing_idx
    ON media_assets (status, created_at)
    WHERE status IN ('queued', 'processing');

CREATE TABLE asset_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID NOT NULL
        REFERENCES media_assets (id) ON DELETE CASCADE,
    variant_key TEXT NOT NULL,
    object_key TEXT NOT NULL UNIQUE,
    mime_type TEXT NOT NULL,
    byte_size BIGINT NOT NULL,
    width INTEGER,
    height INTEGER,
    metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (asset_id, variant_key),
    CONSTRAINT asset_variants_key_not_blank CHECK (BTRIM(variant_key) <> ''),
    CONSTRAINT asset_variants_object_key_not_blank
        CHECK (BTRIM(object_key) <> ''),
    CONSTRAINT asset_variants_mime_type_not_blank
        CHECK (BTRIM(mime_type) <> ''),
    CONSTRAINT asset_variants_byte_size_nonnegative CHECK (byte_size >= 0),
    CONSTRAINT asset_variants_width_positive CHECK (width IS NULL OR width > 0),
    CONSTRAINT asset_variants_height_positive
        CHECK (height IS NULL OR height > 0),
    CONSTRAINT asset_variants_metadata_object
        CHECK (JSONB_TYPEOF(metadata) = 'object')
);

CREATE TABLE activity_assets (
    activity_id UUID NOT NULL
        REFERENCES activities (id) ON DELETE CASCADE,
    asset_id UUID NOT NULL
        REFERENCES media_assets (id) ON DELETE RESTRICT,
    role activity_asset_role NOT NULL,
    position INTEGER NOT NULL DEFAULT 0,
    alt_text TEXT NOT NULL DEFAULT '',
    caption_id TEXT NOT NULL DEFAULT '',
    caption_en TEXT NOT NULL DEFAULT '',
    label_id TEXT NOT NULL DEFAULT '',
    label_en TEXT NOT NULL DEFAULT '',
    crop JSONB,
    metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (activity_id, asset_id),
    UNIQUE (activity_id, role, position),
    CONSTRAINT activity_assets_position_nonnegative CHECK (position >= 0),
    CONSTRAINT activity_assets_crop_object
        CHECK (crop IS NULL OR JSONB_TYPEOF(crop) = 'object'),
    CONSTRAINT activity_assets_metadata_object
        CHECK (JSONB_TYPEOF(metadata) = 'object')
);

CREATE UNIQUE INDEX activity_assets_single_cover_idx
    ON activity_assets (activity_id)
    WHERE role = 'cover';

CREATE INDEX activity_assets_order_idx
    ON activity_assets (activity_id, role, position);

CREATE TABLE processing_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID NOT NULL
        REFERENCES media_assets (id) ON DELETE CASCADE,
    job_type processing_job_type NOT NULL,
    status processing_job_status NOT NULL DEFAULT 'queued',
    idempotency_key TEXT NOT NULL UNIQUE,
    attempts SMALLINT NOT NULL DEFAULT 0,
    max_attempts SMALLINT NOT NULL DEFAULT 3,
    run_after TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    locked_at TIMESTAMPTZ,
    locked_by TEXT,
    heartbeat_at TIMESTAMPTZ,
    last_error TEXT,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT processing_jobs_idempotency_key_not_blank
        CHECK (BTRIM(idempotency_key) <> ''),
    CONSTRAINT processing_jobs_attempts_nonnegative CHECK (attempts >= 0),
    CONSTRAINT processing_jobs_max_attempts_positive CHECK (max_attempts > 0),
    CONSTRAINT processing_jobs_attempts_bounded
        CHECK (attempts <= max_attempts)
);

CREATE INDEX processing_jobs_claim_idx
    ON processing_jobs (run_after, created_at)
    WHERE status = 'queued';

-- +goose Down
DROP TABLE IF EXISTS processing_jobs;
DROP TABLE IF EXISTS activity_assets;
DROP TABLE IF EXISTS asset_variants;
DROP TABLE IF EXISTS media_assets;
DROP TABLE IF EXISTS activity_tags;
DROP TABLE IF EXISTS activities;
DROP TYPE IF EXISTS processing_job_status;
DROP TYPE IF EXISTS processing_job_type;
DROP TYPE IF EXISTS activity_asset_role;
DROP TYPE IF EXISTS asset_status;
DROP TYPE IF EXISTS media_kind;
DROP TYPE IF EXISTS activity_progress;
DROP TYPE IF EXISTS activity_status;
DROP TYPE IF EXISTS activity_category;
