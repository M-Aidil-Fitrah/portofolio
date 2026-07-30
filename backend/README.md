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

## Validation

```bash
make check
```

Authentication, storage, and processing workers are added in separate
checkpoints.
