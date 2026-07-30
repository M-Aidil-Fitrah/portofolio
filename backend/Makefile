GOOSE_VERSION := v3.27.1
SQLC_VERSION := v1.31.1
GOOSE_BUILD_TAGS := no_clickhouse no_libsql no_mssql no_mysql no_sqlite3 no_vertica no_ydb
GOOSE := go run -tags='$(GOOSE_BUILD_TAGS)' github.com/pressly/goose/v3/cmd/goose@$(GOOSE_VERSION)
SQLC := go run github.com/sqlc-dev/sqlc/cmd/sqlc@$(SQLC_VERSION)

.PHONY: run test vet fmt generate sqlc-vet migration-validate migrate-status migrate-up migrate-down check

run:
	go run ./cmd/api

test:
	go test ./...

vet:
	go vet ./...

fmt:
	gofmt -w ./cmd ./internal

generate:
	$(SQLC) generate

sqlc-vet:
	$(SQLC) vet

migration-validate:
	$(GOOSE) -dir db/migrations validate

migrate-status:
	$(GOOSE) -dir db/migrations postgres "$(DATABASE_URL)" status

migrate-up:
	$(GOOSE) -dir db/migrations postgres "$(DATABASE_URL)" up

migrate-down:
	$(GOOSE) -dir db/migrations postgres "$(DATABASE_URL)" down

check:
	go test ./...
	go vet ./...
	$(SQLC) vet
	$(GOOSE) -dir db/migrations validate
