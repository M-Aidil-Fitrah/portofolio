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

## Validation

```bash
make check
```

OpenAPI, authentication, storage, and processing workers are added in separate
checkpoints.
