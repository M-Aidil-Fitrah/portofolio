package auth

import (
	"context"
	"errors"
	"os"
	"testing"
	"time"

	"github.com/M-Aidil-Fitrah/portofolio/backend/internal/config"
	"github.com/M-Aidil-Fitrah/portofolio/backend/internal/database/dbgen"
	"github.com/jackc/pgx/v5/pgxpool"
)

func TestServiceRotationAndReuseRevocation(t *testing.T) {
	databaseURL := os.Getenv("TEST_DATABASE_URL")
	if databaseURL == "" {
		t.Skip("TEST_DATABASE_URL is not set")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	pool, err := pgxpool.New(ctx, databaseURL)
	if err != nil {
		t.Fatalf("pgxpool.New() error = %v", err)
	}
	defer pool.Close()

	passwordHash, err := HashPassword("correct horse battery staple")
	if err != nil {
		t.Fatalf("HashPassword() error = %v", err)
	}
	_, err = dbgen.New(pool).UpsertAdminUser(
		ctx,
		dbgen.UpsertAdminUserParams{
			Email:        "admin@example.com",
			DisplayName:  "Admin",
			PasswordHash: passwordHash,
		},
	)
	if err != nil {
		t.Fatalf("UpsertAdminUser() error = %v", err)
	}

	service, err := NewService(pool, config.AuthConfig{
		JWTSecret: "integration-secret-that-is-at-least-32-bytes",
		Issuer:    "portfolio-api-test",
		Audience:  "portfolio-admin-test",
	})
	if err != nil {
		t.Fatalf("NewService() error = %v", err)
	}

	login, err := service.Login(
		ctx,
		"admin@example.com",
		"correct horse battery staple",
		Metadata{},
	)
	if err != nil {
		t.Fatalf("Login() error = %v", err)
	}
	if _, err := service.Authenticate(
		ctx,
		login.AccessToken,
	); err != nil {
		t.Fatalf("Authenticate(login) error = %v", err)
	}

	rotated, err := service.Refresh(
		ctx,
		login.RefreshToken,
		Metadata{},
	)
	if err != nil {
		t.Fatalf("Refresh() error = %v", err)
	}
	if rotated.RefreshToken == login.RefreshToken {
		t.Fatal("Refresh() did not rotate the refresh token")
	}
	if _, err := service.Authenticate(
		ctx,
		login.AccessToken,
	); !errors.Is(err, ErrInvalidSession) {
		t.Fatalf(
			"Authenticate(old access) error = %v, want ErrInvalidSession",
			err,
		)
	}
	if _, err := service.Authenticate(
		ctx,
		rotated.AccessToken,
	); err != nil {
		t.Fatalf("Authenticate(rotated) error = %v", err)
	}

	if _, err := service.Refresh(
		ctx,
		login.RefreshToken,
		Metadata{},
	); !errors.Is(err, ErrRefreshReuse) {
		t.Fatalf("Refresh(reuse) error = %v, want ErrRefreshReuse", err)
	}
	if _, err := service.Authenticate(
		ctx,
		rotated.AccessToken,
	); !errors.Is(err, ErrInvalidSession) {
		t.Fatalf(
			"Authenticate(after reuse) error = %v, want ErrInvalidSession",
			err,
		)
	}
}
