# Portfolio API

Modular Go backend for the portfolio activity platform.

## Requirements

- Go 1.26 or newer
- PostgreSQL 14 or newer

## Local development

```bash
cp .env.example .env
set -a
source .env
set +a
make migrate-up
go run ./cmd/api
```

The initial service exposes:

- `GET /api/v1`
- `GET /healthz`
- `GET /readyz`

The process fails fast when PostgreSQL cannot be reached. Health checks only
report process health, while readiness checks include a database ping.

## Database workflow

Goose migrations are stored in `db/migrations`, handwritten SQL queries in
`db/queries`, and generated type-safe Go code in
`internal/database/dbgen`.

```bash
make migration-validate
make migrate-status
make migrate-up
make generate
make sqlc-vet
```

Create a new migration with a sequential timestamp-style name and keep both
the Goose `Up` and `Down` sections reversible. Generated `dbgen` files are
committed so application builds do not require the generator.

## API contract and documentation

`api/openapi.yaml` is the source of truth for HTTP paths and schemas. Gin
interfaces and Go models are generated into `internal/contract`.

```bash
make generate-api
```

Scalar is exposed at `/docs` and the JSON contract at `/openapi.json` only
when `APP_ENV` is `local` or `staging`. Both routes intentionally return 404
in production.

## Administrator access

Create or rotate the initial administrator credentials with the one-shot CLI.
The plaintext password is never written to PostgreSQL or the repository.

```bash
ADMIN_EMAIL=admin@example.com \
ADMIN_NAME="Muhammad Aidil Fitrah" \
ADMIN_PASSWORD="replace-with-a-long-password" \
make admin-upsert
```

Authentication uses a ten-minute access JWT and a rotating opaque refresh
token with a 30-minute idle timeout. Both are sent only through `HttpOnly`,
`Secure`, `SameSite=Lax` cookies. Reusing a consumed refresh token revokes its
session.

## Validation

```bash
make check
```

Authentication, storage, and processing workers are added in separate
checkpoints.
