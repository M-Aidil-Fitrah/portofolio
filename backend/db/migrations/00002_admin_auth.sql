-- +goose Up
CREATE TABLE admin_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    disabled_at TIMESTAMPTZ,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT admin_users_email_normalized
        CHECK (email = LOWER(BTRIM(email))),
    CONSTRAINT admin_users_email_not_blank CHECK (BTRIM(email) <> ''),
    CONSTRAINT admin_users_display_name_not_blank
        CHECK (BTRIM(display_name) <> ''),
    CONSTRAINT admin_users_password_hash_not_blank
        CHECK (BTRIM(password_hash) <> '')
);

CREATE TABLE auth_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_user_id UUID NOT NULL
        REFERENCES admin_users (id) ON DELETE CASCADE,
    current_refresh_token_hash BYTEA NOT NULL UNIQUE,
    current_access_jti UUID NOT NULL UNIQUE,
    idle_expires_at TIMESTAMPTZ NOT NULL,
    absolute_expires_at TIMESTAMPTZ NOT NULL,
    last_rotated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    user_agent TEXT NOT NULL DEFAULT '',
    ip_address INET,
    revoked_at TIMESTAMPTZ,
    revoke_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT auth_sessions_expiry_order
        CHECK (idle_expires_at <= absolute_expires_at),
    CONSTRAINT auth_sessions_revocation_pair
        CHECK (
            (revoked_at IS NULL AND revoke_reason IS NULL)
            OR (revoked_at IS NOT NULL AND revoke_reason IS NOT NULL)
        )
);

CREATE INDEX auth_sessions_user_idx
    ON auth_sessions (admin_user_id, created_at DESC);

CREATE INDEX auth_sessions_expiry_idx
    ON auth_sessions (idle_expires_at)
    WHERE revoked_at IS NULL;

CREATE TABLE auth_consumed_refresh_tokens (
    token_hash BYTEA PRIMARY KEY,
    session_id UUID NOT NULL
        REFERENCES auth_sessions (id) ON DELETE CASCADE,
    consumed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX auth_consumed_refresh_tokens_session_idx
    ON auth_consumed_refresh_tokens (session_id, consumed_at DESC);

-- +goose Down
DROP TABLE IF EXISTS auth_consumed_refresh_tokens;
DROP TABLE IF EXISTS auth_sessions;
DROP TABLE IF EXISTS admin_users;
