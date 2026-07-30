.PHONY: run test vet fmt check

run:
	go run ./cmd/api

test:
	go test ./...

vet:
	go vet ./...

fmt:
	gofmt -w ./cmd ./internal

check:
	go test ./...
	go vet ./...
