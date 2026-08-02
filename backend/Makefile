GOOSE_VERSION := v3.27.1
OAPI_CODEGEN_VERSION := v2.8.0
SQLC_VERSION := v1.31.1
GOOSE_BUILD_TAGS := no_clickhouse no_libsql no_mssql no_mysql no_sqlite3 no_vertica no_ydb
GOOSE := go run -tags='$(GOOSE_BUILD_TAGS)' github.com/pressly/goose/v3/cmd/goose@$(GOOSE_VERSION)
OAPI_CODEGEN := go run github.com/oapi-codegen/oapi-codegen/v2/cmd/oapi-codegen@$(OAPI_CODEGEN_VERSION)
SQLC := go run github.com/sqlc-dev/sqlc/cmd/sqlc@$(SQLC_VERSION)

# Semua target yang butuh env membacanya lewat config.LoadDotEnv() di dalam
# binary Go, bukan lewat make. Jadi tidak ada target di file ini yang perlu
# `DATABASE_URL=... make ...` atau export manual — cukup isi backend/.env.
.PHONY: run admin-upsert storage-init seed seed-keep seed-purge test migrate-test vet fmt generate generate-api generate-db sqlc-vet migration-new migration-validate migrate-status migrate-up migrate-down check

run:
	go run ./cmd/api

admin-upsert:
	go run ./cmd/admin

storage-init:
	go run ./cmd/storage-init

# seed replaces previous demo content on each run; seed-keep adds to it.
# Both refuse to run when APP_ENV=production.
seed:
	go run ./cmd/seed apply

seed-keep:
	go run ./cmd/seed -keep apply

seed-purge:
	go run ./cmd/seed purge

# Integration test butuh schema yang sudah termigrasi, jadi database test selalu
# disamakan dulu. Lewat cmd/migrate juga, supaya sumber URL-nya satu jalur.
# -count=1 mematikan cache: hasil integration test bergantung pada isi database,
# yang tidak ikut jadi bagian dari cache key Go.
# -p 1 menjalankan paket satu per satu: semua integration test berbagi satu
# TEST_DATABASE_URL, jadi paket yang jalan paralel akan saling menghapus data.
test: migrate-test
	go test -count=1 -p 1 ./...

# reset dulu: integration test menulis baris dengan object key tetap dan tidak
# membersihkan diri, jadi tanpa ini run kedua gagal karena unique constraint.
# Aman karena hanya menyentuh TEST_DATABASE_URL, bukan DATABASE_URL.
migrate-test:
	go run ./cmd/migrate -url-env TEST_DATABASE_URL reset
	go run ./cmd/migrate -url-env TEST_DATABASE_URL up

vet:
	go vet ./...

fmt:
	gofmt -w ./cmd ./internal

generate:
	$(MAKE) generate-api
	$(MAKE) generate-db

generate-api:
	$(OAPI_CODEGEN) --config api/oapi-codegen.yaml api/openapi.yaml

generate-db:
	$(SQLC) generate

sqlc-vet:
	$(SQLC) vet

migration-new:
	@test -n "$(name)" || { echo "usage: make migration-new name=<nama_migrasi>"; exit 1; }
	$(GOOSE) -dir db/migrations -s create $(name) sql

migration-validate:
	go run ./cmd/migrate validate

migrate-status:
	go run ./cmd/migrate status

migrate-up:
	go run ./cmd/migrate up

migrate-down:
	go run ./cmd/migrate down

# generate-check regenerates from openapi.yaml and the sqlc queries, then fails
# if anything moved. Without it a hand-edit to the generated code, or a schema
# change that was never regenerated, ships silently — the contract and the
# server would disagree while every test still passes.
# Compares against what is on disk rather than against HEAD, so it still works
# with uncommitted regeneration — the invariant is that generating is a no-op,
# not that the tree is clean.
GENERATED_DIRS := internal/contract internal/database/dbgen
generate-check: SHELL := /bin/bash
generate-check:
	@before=$$(find $(GENERATED_DIRS) -type f -exec sha256sum {} + | sort); \
	$(MAKE) --no-print-directory generate >/dev/null; \
	after=$$(find $(GENERATED_DIRS) -type f -exec sha256sum {} + | sort); \
	if [ "$$before" != "$$after" ]; then \
		echo "generated code is stale — run 'make generate' and commit"; \
		diff <(echo "$$before") <(echo "$$after") || true; \
		exit 1; \
	fi

check: test
	go vet ./...
	@test -z "$$(gofmt -l ./cmd ./internal ./db)" || { \
		gofmt -l ./cmd ./internal ./db; echo "run 'make fmt'"; exit 1; \
	}
	$(SQLC) vet
	go run ./cmd/migrate validate
	$(MAKE) generate-check
