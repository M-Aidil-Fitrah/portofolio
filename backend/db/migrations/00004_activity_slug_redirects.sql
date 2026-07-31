-- +goose Up
-- Keeps shared links and search rankings alive when a slug is edited: the old
-- slug still resolves and the reader is sent to the current one.
CREATE TABLE activity_slug_redirects (
    slug VARCHAR(72) PRIMARY KEY,
    activity_id UUID NOT NULL
        REFERENCES activities (id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT activity_slug_redirects_format
        CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

CREATE INDEX activity_slug_redirects_activity_idx
    ON activity_slug_redirects (activity_id);

-- +goose Down
DROP TABLE IF EXISTS activity_slug_redirects;
