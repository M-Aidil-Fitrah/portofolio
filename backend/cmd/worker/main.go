package main

import (
	"context"
	"log/slog"
	"os"
	"os/signal"
	"syscall"

	"github.com/M-Aidil-Fitrah/portofolio/backend/internal/config"
	"github.com/M-Aidil-Fitrah/portofolio/backend/internal/database"
	"github.com/M-Aidil-Fitrah/portofolio/backend/internal/processing"
	"github.com/M-Aidil-Fitrah/portofolio/backend/internal/storage"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		slog.Error("invalid configuration", "error", err)
		os.Exit(1)
	}
	if cfg.Environment == config.EnvironmentProduction && os.Geteuid() == 0 {
		slog.Error("media worker must not run as root in production")
		os.Exit(1)
	}
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: cfg.LogLevel,
	}))
	slog.SetDefault(logger)

	ctx, stop := signal.NotifyContext(
		context.Background(),
		syscall.SIGINT,
		syscall.SIGTERM,
	)
	defer stop()
	pool, err := database.Open(ctx, cfg.Database)
	if err != nil {
		logger.Error("connect to database", "error", err)
		os.Exit(1)
	}
	defer pool.Close()
	objectStore, err := storage.NewMinioStore(cfg.Storage)
	if err != nil {
		logger.Error("initialize object storage", "error", err)
		os.Exit(1)
	}
	if err := objectStore.Ready(ctx); err != nil {
		logger.Error("object storage is not ready", "error", err)
		os.Exit(1)
	}

	worker := processing.NewWorker(
		pool,
		objectStore,
		processing.WorkerOptions{
			ID:          os.Getenv("WORKER_ID"),
			Logger:      logger,
			ImageBinary: os.Getenv("IMAGEMAGICK_BINARY"),
		},
	)
	if err := worker.Run(ctx); err != nil {
		logger.Error("media worker stopped", "error", err)
		os.Exit(1)
	}
}
