-- name: UpsertAdminUser :one
INSERT INTO admin_users (
    email,
    display_name,
    password_hash
) VALUES (
    LOWER(BTRIM(sqlc.arg(email))),
    BTRIM(sqlc.arg(display_name)),
    sqlc.arg(password_hash)
)
ON CONFLICT (email) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    password_hash = EXCLUDED.password_hash,
    disabled_at = NULL,
    updated_at = NOW()
RETURNING *;

-- name: GetActiveAdminUserByEmail :one
SELECT *
FROM admin_users
WHERE email = LOWER(BTRIM(sqlc.arg(email)))
  AND disabled_at IS NULL;

-- name: CreateAuthSession :one
INSERT INTO auth_sessions (
    id,
    admin_user_id,
    current_refresh_token_hash,
    current_access_jti,
    idle_expires_at,
    absolute_expires_at,
    user_agent,
    ip_address
) VALUES (
    sqlc.arg(session_id),
    sqlc.arg(admin_user_id),
    sqlc.arg(refresh_token_hash),
    sqlc.arg(access_jti),
    sqlc.arg(idle_expires_at),
    sqlc.arg(absolute_expires_at),
    sqlc.arg(user_agent),
    sqlc.narg(ip_address)
)
RETURNING *;

-- name: MarkAdminLogin :exec
UPDATE admin_users
SET last_login_at = NOW(),
    updated_at = NOW()
WHERE id = sqlc.arg(admin_user_id);

-- name: LockAuthSessionByRefreshHash :one
SELECT
    s.*,
    u.email,
    u.display_name,
    u.disabled_at
FROM auth_sessions AS s
JOIN admin_users AS u ON u.id = s.admin_user_id
WHERE s.current_refresh_token_hash = sqlc.arg(refresh_token_hash)
FOR UPDATE OF s;

-- name: RecordConsumedRefreshToken :exec
INSERT INTO auth_consumed_refresh_tokens (
    token_hash,
    session_id
) VALUES (
    sqlc.arg(token_hash),
    sqlc.arg(session_id)
);

-- name: FindSessionByConsumedRefreshHash :one
SELECT session_id
FROM auth_consumed_refresh_tokens
WHERE token_hash = sqlc.arg(token_hash);

-- name: RotateAuthSession :one
UPDATE auth_sessions
SET current_refresh_token_hash = sqlc.arg(refresh_token_hash),
    current_access_jti = sqlc.arg(access_jti),
    idle_expires_at = sqlc.arg(idle_expires_at),
    last_rotated_at = NOW(),
    user_agent = sqlc.arg(user_agent),
    ip_address = sqlc.narg(ip_address),
    updated_at = NOW()
WHERE id = sqlc.arg(session_id)
  AND revoked_at IS NULL
RETURNING *;

-- name: GetActiveSessionPrincipal :one
SELECT
    s.id AS session_id,
    s.current_access_jti,
    s.idle_expires_at,
    s.absolute_expires_at,
    u.id AS admin_user_id,
    u.email,
    u.display_name
FROM auth_sessions AS s
JOIN admin_users AS u ON u.id = s.admin_user_id
WHERE s.id = sqlc.arg(session_id)
  AND s.current_access_jti = sqlc.arg(access_jti)
  AND s.revoked_at IS NULL
  AND s.idle_expires_at > NOW()
  AND s.absolute_expires_at > NOW()
  AND u.disabled_at IS NULL;

-- name: RevokeAuthSession :execrows
UPDATE auth_sessions
SET revoked_at = COALESCE(revoked_at, NOW()),
    revoke_reason = COALESCE(revoke_reason, sqlc.arg(reason)),
    updated_at = NOW()
WHERE id = sqlc.arg(session_id)
  AND revoked_at IS NULL;
