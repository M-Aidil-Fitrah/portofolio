GOOSE_VERSION := v3.27.1
OAPI_CODEGEN_VERSION := v2.8.0
SQLC_VERSION := v1.31.1
GOOSE_BUILD_TAGS := no_clickhouse no_libsql no_mssql no_mysql no_sqlite3 no_vertica no_ydb
GOOSE := go run -tags='$(GOOSE_BUILD_TAGS)' github.com/pressly/goose/v3/cmd/goose@$(GOOSE_VERSION)
OAPI_CODEGEN := go run github.com/oapi-codegen/oapi-codegen/v2/cmd/oapi-codegen@$(OAPI_CODEGEN_VERSION)
SQLC := go run github.com/sqlc-dev/sqlc/cmd/sqlc@$(SQLC_VERSION)

.PHONY: run test vet fmt generate generate-api generate-db sqlc-vet migration-validate migrate-status migrate-up migrate-down check

run:
	go run ./cmd/api

test:
	go test ./...

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
