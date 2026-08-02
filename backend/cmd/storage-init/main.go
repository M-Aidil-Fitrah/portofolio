package main

import (
	"context"
	"log/slog"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/M-Aidil-Fitrah/portofolio/backend/internal/config"
	"github.com/M-Aidil-Fitrah/portofolio/backend/internal/storage"
)

func main() {
	if err := config.LoadDotEnv(); err != nil {
		slog.Error("load .env", "error", err)
		os.Exit(1)
	}

	useTLS, err := strconv.ParseBool(envOrDefault("STORAGE_USE_TLS", "false"))
	if err != nil {
		slog.Error("invalid STORAGE_USE_TLS", "error", err)
		os.Exit(1)
	}
	cfg := config.StorageConfig{
		Endpoint:  strings.TrimSpace(os.Getenv("STORAGE_ENDPOINT")),
		AccessKey: strings.TrimSpace(os.Getenv("STORAGE_ACCESS_KEY")),
		SecretKey: strings.TrimSpace(os.Getenv("STORAGE_SECRET_KEY")),
		Bucket:    strings.TrimSpace(os.Getenv("STORAGE_BUCKET")),
		Region:    envOrDefault("STORAGE_REGION", "us-east-1"),
		UseTLS:    useTLS,
	}
	if cfg.Endpoint == "" || cfg.AccessKey == "" ||
		cfg.SecretKey == "" || cfg.Bucket == "" {
		slog.Error("storage endpoint, credentials, and bucket are required")
		os.Exit(1)
	}
	store, err := storage.NewMinioStore(cfg)
	if err != nil {
		slog.Error("initialize object storage", "error", err)
		os.Exit(1)
	}
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	if err := store.EnsureBucket(ctx, cfg.Region); err != nil {
		slog.Error("ensure object storage bucket", "error", err)
		os.Exit(1)
	}
	slog.Info("object storage bucket is ready", "bucket", cfg.Bucket)
}

func envOrDefault(key, fallback string) string {
	if value := strings.TrimSpace(os.Getenv(key)); value != "" {
		return value
	}
	return fallback
}
