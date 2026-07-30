-- name: GetDatabaseTime :one
SELECT NOW()::TIMESTAMPTZ AS database_time;
