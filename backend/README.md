# Portfolio API

Modular Go backend for the portfolio activity platform.

## Requirements

- Go 1.26 or newer

## Local development

```bash
cp .env.example .env
set -a
source .env
set +a
go run ./cmd/api
```

The initial service exposes:

- `GET /api/v1`
- `GET /healthz`
- `GET /readyz`

## Validation

```bash
make check
```

Database, OpenAPI, authentication, storage, and processing workers are added
in separate checkpoints.
