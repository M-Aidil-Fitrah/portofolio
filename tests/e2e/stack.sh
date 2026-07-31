#!/usr/bin/env bash
set -euo pipefail

repository_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
stack_root="$(mktemp -d /tmp/portfolio-e2e-stack.XXXXXX)"
postgres_data="$stack_root/postgres"
postgres_socket="$stack_root/postgres-socket"
minio_data="$stack_root/minio"

postgres_port=55441
minio_port=59000
minio_console_port=59001
api_port=58080
web_port=3102

child_pids=()

cleanup() {
  set +e
  for pid in "${child_pids[@]:-}"; do
    kill "$pid" 2>/dev/null
  done
  wait 2>/dev/null
  rm -rf "$stack_root"
}
trap cleanup EXIT INT TERM

wait_for_url() {
  local url="$1"
  local attempts="${2:-240}"
  for ((attempt = 1; attempt <= attempts; attempt++)); do
    if curl --fail --silent --show-error "$url" >/dev/null 2>&1; then
      return 0
    fi
    sleep 0.25
  done
  echo "Timed out waiting for $url" >&2
  return 1
}

mkdir -p "$postgres_socket" "$minio_data"
initdb -D "$postgres_data" -A trust -U postgres >"$stack_root/initdb.log"
postgres \
  -D "$postgres_data" \
  -F \
  -h 127.0.0.1 \
  -p "$postgres_port" \
  -k "$postgres_socket" \
  >"$stack_root/postgres.log" 2>&1 &
child_pids+=("$!")
for ((attempt = 1; attempt <= 120; attempt++)); do
  if pg_isready -h 127.0.0.1 -p "$postgres_port" >/dev/null 2>&1; then
    break
  fi
  if [[ "$attempt" == "120" ]]; then
    echo "Timed out waiting for PostgreSQL" >&2
    exit 1
  fi
  sleep 0.25
done
createdb -h 127.0.0.1 -p "$postgres_port" -U postgres portfolio_e2e

export DATABASE_URL="postgres://postgres@127.0.0.1:$postgres_port/portfolio_e2e?sslmode=disable"
export TEST_DATABASE_URL="$DATABASE_URL"
export APP_ENV=test
export HTTP_ADDR="127.0.0.1:$api_port"
export LOG_LEVEL=warn
export AUTH_JWT_SECRET=portfolio-e2e-jwt-secret-with-at-least-32-bytes
export AUTH_ISSUER=portfolio-api-e2e
export AUTH_AUDIENCE=portfolio-admin-e2e
export WEB_ORIGIN="http://localhost:$web_port"
export STORAGE_ENDPOINT="localhost:$minio_port"
export STORAGE_ACCESS_KEY=portfolioe2e
export STORAGE_SECRET_KEY=portfolio-e2e-storage-secret
export STORAGE_BUCKET=portfolio-e2e
export STORAGE_REGION=us-east-1
export STORAGE_USE_TLS=false
export STORAGE_PRESIGN_TIMEOUT=5m
export MINIO_ROOT_USER="$STORAGE_ACCESS_KEY"
export MINIO_ROOT_PASSWORD="$STORAGE_SECRET_KEY"
# Public asset requests reach storage through a redirect from the API, and a
# cross-origin redirect makes the browser send `Origin: null`. Pinning this to
# the web origin would reject exactly those requests, so keep the default.
export MINIO_API_CORS_ALLOW_ORIGIN="*"
export WORKER_ID=portfolio-e2e-worker
export IMAGEMAGICK_BINARY=magick
export MAGICK_CONFIGURE_PATH="$repository_root/backend/config/imagemagick"
export FFMPEG_BINARY=ffmpeg
export FFPROBE_BINARY=ffprobe
export LIBREOFFICE_BINARY=libreoffice
export PDFINFO_BINARY=pdfinfo
export PDFTOPPM_BINARY=pdftoppm
export DOCUMENT_SANDBOX_BINARY=
export RESEND_API_KEY=
export CONTACT_FROM_EMAIL=
export CONTACT_TO_EMAIL=
export ADMIN_EMAIL=admin@test.local
export ADMIN_NAME="Portfolio Test Admin"
export ADMIN_PASSWORD=test-password-123
export NEXT_PUBLIC_API_URL="http://localhost:$api_port"
export API_URL="$NEXT_PUBLIC_API_URL"
# Never the default .next: a test build there overwrites the running dev
# server's output and leaves it serving 404s for routes it already had.
export NEXT_DIST_DIR="${NEXT_DIST_DIR:-.next-playwright}"
export NEXT_PUBLIC_SITE_URL="http://localhost:$web_port"

minio server "$minio_data" \
  --address "127.0.0.1:$minio_port" \
  --console-address "127.0.0.1:$minio_console_port" \
  >"$stack_root/minio.log" 2>&1 &
child_pids+=("$!")
wait_for_url "http://localhost:$minio_port/minio/health/live"

(
  cd "$repository_root/backend"
  GOCACHE=/tmp/portfolio-go-build-cache make migrate-up
  GOCACHE=/tmp/portfolio-go-build-cache make storage-init
  GOCACHE=/tmp/portfolio-go-build-cache make admin-upsert
)

(
  cd "$repository_root/backend"
  GOCACHE=/tmp/portfolio-go-build-cache go run ./cmd/api
) >"$stack_root/api.log" 2>&1 &
child_pids+=("$!")
wait_for_url "http://localhost:$api_port/readyz"

(
  cd "$repository_root/backend"
  GOCACHE=/tmp/portfolio-go-build-cache go run ./cmd/worker
) >"$stack_root/worker.log" 2>&1 &
child_pids+=("$!")

(
  cd "$repository_root"
  pnpm exec next start -H 127.0.0.1 -p "$web_port"
) >"$stack_root/next.log" 2>&1 &
next_pid="$!"
child_pids+=("$next_pid")
wait_for_url "http://localhost:$web_port/admin/login"

wait "$next_pid"
