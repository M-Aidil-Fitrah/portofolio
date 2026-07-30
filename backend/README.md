# Portfolio API

Modular Go backend for the portfolio activity platform.

## Requirements

- Go 1.26 or newer
- PostgreSQL 14 or newer
- S3-compatible private object storage
- ImageMagick 7 with WebP, AVIF, and HEIC delegates
- FFmpeg and ffprobe with H.264, AAC, and WebP support
- LibreOffice headless and Poppler (`pdfinfo`, `pdftoppm`)

## Local development

```bash
cp .env.example .env
set -a
source .env
set +a
make migrate-up
go run ./cmd/api
go run ./cmd/worker
```

The initial service exposes:

- `GET /api/v1`
- `GET /healthz`
- `GET /readyz`

The process fails fast when PostgreSQL cannot be reached. Health checks only
report process health, while readiness checks include PostgreSQL and the
configured object-storage bucket.

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

## Asset uploads

Administrators upload media directly to private S3-compatible storage:

1. `POST /api/v1/admin/assets/uploads` creates an asset and presigned `PUT`.
2. The browser uploads the original object without proxying bytes through Gin.
3. `POST /api/v1/admin/assets/{id}/complete` verifies its actual size and
   creates one idempotent processing job.
4. `GET /api/v1/admin/assets/{id}` polls only while the asset is queued or
   processing.

Limits apply per file: 25 MB for images, 250 MB for videos, and 50 MB for
documents. The database and API do not impose a media-count limit. Original
object keys use random UUIDs and originals remain private.

The image worker accepts JPEG, PNG, WebP, AVIF, HEIC, TIFF, BMP, GIF, and
animated images only after signature and decoder validation. It normalizes
orientation, strips EXIF/GPS, produces deterministic lossless WebP master,
cover, and responsive variants without responsive upscaling, and retains a
smaller sanitized browser-compatible original for delivery when lossless WebP
would increase the payload. Original uploads remain private.

Run the worker as a non-root user. `MAGICK_CONFIGURE_PATH` points to the
checked-in deny-by-default policy, which disables delegates and indirect reads
and limits memory, disk, pixels, threads, and processing time. Jobs are claimed
with `FOR UPDATE SKIP LOCKED`, heartbeat while active, retry at most three
times, and write deterministic idempotent object keys.

Video inputs are accepted only when `ffprobe` can decode them and are limited
to 250 MB and five minutes per file. Compatible MP4 H.264/AAC sources are
remuxed with `faststart`; other sources are asynchronously transcoded to MP4
H.264, AAC 128 kbps, `yuv420p`, CRF 21, preset `medium`, at most 1080p and 60
fps, without upscaling. Every video receives a lossless WebP poster. FFmpeg
network protocols are disabled for processing inputs.

Document uploads accept PDF, DOC/DOCX, PPT/PPTX, XLS/XLSX, ODT/ODP/ODS,
TXT, and Markdown up to 50 MB per file. Macro-enabled extensions and embedded
VBA projects are rejected. PDFs are validated directly; other documents are
opened with a macro-disabled temporary LibreOffice profile and converted to a
private PDF preview. Poppler validates the page count and renders the first
page before ImageMagick creates a lossless WebP thumbnail. Set
`DOCUMENT_SANDBOX_BINARY=bwrap` in a host that permits user namespaces, and
run the worker container without network access and with CPU, memory, and
filesystem limits.

## Engagement

Likes and comments are persisted in PostgreSQL. A random, `HttpOnly` visitor
cookie provides idempotent like state without storing an IP address. Public
mutations require the configured web origin and are rate-limited per visitor.
Visible comments are paginated; authenticated administrators can list, hide,
restore, or permanently delete comments.

## Contact delivery

`POST /api/v1/contact` validates the existing contact form contract, preserves
the honeypot response, and sends through Resend from Go. The endpoint requires
the configured web origin, limits each anonymous visitor to five attempts per
ten minutes, caps request size, and never logs message bodies or API keys.
Production startup requires the Resend key and sender/recipient addresses and
only accepts the official HTTPS Resend endpoint.

## Validation

```bash
make check
```

## Generated web client

The web application generates fetch-based TanStack Query hooks, TypeScript
models, and Zod 4 schemas from `api/openapi.yaml`:

```bash
cd ..
pnpm api:generate
pnpm api:check
```

Set `NEXT_PUBLIC_API_URL` for browser calls and `API_URL` for server component
calls. Both default to `http://localhost:8080` during local development.
Generated files in `src/lib/api/generated` are committed; CI regenerates them
to detect contract drift.
