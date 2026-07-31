package main

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"strings"
	"time"

	"github.com/M-Aidil-Fitrah/portofolio/backend/internal/auth"
	"github.com/M-Aidil-Fitrah/portofolio/backend/internal/config"
	"github.com/M-Aidil-Fitrah/portofolio/backend/internal/database/dbgen"
	"github.com/jackc/pgx/v5/pgxpool"
)

func main() {
	if err := config.LoadDotEnv(); err != nil {
		slog.Error("load .env", "error", err)
		os.Exit(1)
	}

	databaseURL := strings.TrimSpace(os.Getenv("DATABASE_URL"))
	email := strings.ToLower(strings.TrimSpace(os.Getenv("ADMIN_EMAIL")))
	name := strings.TrimSpace(os.Getenv("ADMIN_NAME"))
	password := os.Getenv("ADMIN_PASSWORD")

	if databaseURL == "" || email == "" || name == "" || len(password) < 10 {
		slog.Error(
			"invalid admin bootstrap configuration",
			"required",
			"DATABASE_URL, ADMIN_EMAIL, ADMIN_NAME, and 10+ character ADMIN_PASSWORD",
		)
		os.Exit(1)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	pool, err := pgxpool.New(ctx, databaseURL)
	if err != nil {
		slog.Error("create database pool", "error", err)
		os.Exit(1)
	}
	defer pool.Close()
	if err := pool.Ping(ctx); err != nil {
		slog.Error("connect to database", "error", err)
		os.Exit(1)
	}

	passwordHash, err := auth.HashPassword(password)
	if err != nil {
		slog.Error("hash admin password", "error", err)
		os.Exit(1)
	}
	user, err := dbgen.New(pool).UpsertAdminUser(
		ctx,
		dbgen.UpsertAdminUserParams{
			Email:        email,
			DisplayName:  name,
			PasswordHash: passwordHash,
		},
	)
	if err != nil {
		slog.Error("upsert admin user", "error", err)
		os.Exit(1)
	}

	fmt.Printf("admin user ready: %s (%s)\n", user.Email, user.ID.String())
}
