-- +goose Up
CREATE TYPE comment_status AS ENUM ('visible', 'hidden');

CREATE TABLE activity_likes (
    activity_id UUID NOT NULL
        REFERENCES activities (id) ON DELETE CASCADE,
    visitor_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (activity_id, visitor_id)
);

CREATE INDEX activity_likes_activity_idx
    ON activity_likes (activity_id, created_at);

CREATE TABLE activity_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_id UUID NOT NULL
        REFERENCES activities (id) ON DELETE CASCADE,
    author_name VARCHAR(80) NOT NULL,
    body VARCHAR(2000) NOT NULL,
    status comment_status NOT NULL DEFAULT 'visible',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT activity_comments_author_not_blank
        CHECK (BTRIM(author_name) <> ''),
    CONSTRAINT activity_comments_body_not_blank
        CHECK (BTRIM(body) <> '')
);

CREATE INDEX activity_comments_public_idx
    ON activity_comments (activity_id, created_at DESC)
    WHERE status = 'visible';

CREATE INDEX activity_comments_admin_idx
    ON activity_comments (status, created_at DESC);

-- +goose Down
DROP TABLE IF EXISTS activity_comments;
DROP TABLE IF EXISTS activity_likes;
DROP TYPE IF EXISTS comment_status;
