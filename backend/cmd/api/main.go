package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/M-Aidil-Fitrah/portofolio/backend/internal/activity"
	"github.com/M-Aidil-Fitrah/portofolio/backend/internal/auth"
	"github.com/M-Aidil-Fitrah/portofolio/backend/internal/config"
	"github.com/M-Aidil-Fitrah/portofolio/backend/internal/database"
	"github.com/M-Aidil-Fitrah/portofolio/backend/internal/engagement"
	"github.com/M-Aidil-Fitrah/portofolio/backend/internal/httpapi"
	"github.com/M-Aidil-Fitrah/portofolio/backend/internal/storage"
)

var (
	version = "dev"
	commit  = "unknown"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		slog.Error("invalid configuration", "error", err)
		os.Exit(1)
	}

	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: cfg.LogLevel,
	}))
	slog.SetDefault(logger)

	pool, err := database.Open(context.Background(), cfg.Database)
	if err != nil {
		logger.Error("connect to database", "error", err)
		os.Exit(1)
	}
	defer pool.Close()

	authService, err := auth.NewService(pool, cfg.Auth)
	if err != nil {
		logger.Error("initialize auth service", "error", err)
		os.Exit(1)
	}
	activityService := activity.NewService(pool)
	engagementService := engagement.NewService(pool)
	objectStore, err := storage.NewMinioStore(cfg.Storage)
	if err != nil {
		logger.Error("initialize object storage", "error", err)
		os.Exit(1)
	}
	assetService := storage.NewService(
		pool,
		objectStore,
		cfg.Storage.PresignTimeout,
	)

	router := httpapi.NewRouter(httpapi.Options{
		Environment: cfg.Environment,
		Logger:      logger,
		Build: httpapi.BuildInfo{
			Version: version,
			Commit:  commit,
		},
		Readiness: func(ctx context.Context) error {
			if err := pool.Ping(ctx); err != nil {
				return err
			}
			return objectStore.Ready(ctx)
		},
		Auth:       authService,
		Activities: activityService,
		Assets:     assetService,
		Engagement: engagementService,
		WebOrigin:  cfg.Auth.WebOrigin,
	})
	server := &http.Server{
		Addr:              cfg.HTTPAddr,
		Handler:           router,
		ReadHeaderTimeout: cfg.ReadHeaderTimeout,
		ReadTimeout:       cfg.ReadTimeout,
		WriteTimeout:      cfg.WriteTimeout,
		IdleTimeout:       cfg.IdleTimeout,
		MaxHeaderBytes:    1 << 20,
	}

	ctx, stop := signal.NotifyContext(
		context.Background(),
		syscall.SIGINT,
		syscall.SIGTERM,
	)
	defer stop()

	if err := run(ctx, server, cfg.ShutdownTimeout, logger); err != nil {
		logger.Error("api server stopped", "error", err)
		os.Exit(1)
	}
}

func run(
	ctx context.Context,
	server *http.Server,
	shutdownTimeout time.Duration,
	logger *slog.Logger,
) error {
	serverErrors := make(chan error, 1)
	go func() {
		logger.Info(
			"api server listening",
			"address", server.Addr,
			"version", version,
			"commit", commit,
		)
		serverErrors <- server.ListenAndServe()
	}()

	select {
	case err := <-serverErrors:
		if errors.Is(err, http.ErrServerClosed) {
			return nil
		}
		return err
	case <-ctx.Done():
		logger.Info("api server shutting down")
	}

	shutdownCtx, cancel := context.WithTimeout(
		context.Background(),
		shutdownTimeout,
	)
	defer cancel()

	if err := server.Shutdown(shutdownCtx); err != nil {
		return err
	}

	select {
	case err := <-serverErrors:
		if err != nil && !errors.Is(err, http.ErrServerClosed) {
			return err
		}
	case <-shutdownCtx.Done():
		return shutdownCtx.Err()
	}

	logger.Info("api server stopped")
	return nil
}
