package config

import (
	"log/slog"
	"testing"
	"time"
)

func TestLoadDefaults(t *testing.T) {
	clearConfigEnvironment(t)

	cfg, err := Load()
	if err != nil {
		t.Fatalf("Load() error = %v", err)
	}

	if cfg.Environment != EnvironmentLocal {
		t.Fatalf("Environment = %q, want %q", cfg.Environment, EnvironmentLocal)
	}
	if cfg.HTTPAddr != ":8080" {
		t.Fatalf("HTTPAddr = %q, want :8080", cfg.HTTPAddr)
	}
	if cfg.LogLevel != slog.LevelInfo {
		t.Fatalf("LogLevel = %v, want info", cfg.LogLevel)
	}
	if cfg.Database.MaxConns != 10 || cfg.Database.MinConns != 2 {
		t.Fatalf(
			"database pool = %d/%d, want 2/10",
			cfg.Database.MinConns,
			cfg.Database.MaxConns,
		)
	}
	if cfg.Auth.WebOrigin != "http://localhost:3000" {
		t.Fatalf("WebOrigin = %q", cfg.Auth.WebOrigin)
	}
	if cfg.ShutdownTimeout != 10*time.Second {
		t.Fatalf(
			"ShutdownTimeout = %v, want 10s",
			cfg.ShutdownTimeout,
		)
	}
}

func TestLoadRejectsInvalidValues(t *testing.T) {
	clearConfigEnvironment(t)
	t.Setenv("APP_ENV", "preview")

	if _, err := Load(); err == nil {
		t.Fatal("Load() error = nil, want invalid APP_ENV error")
	}

	t.Setenv("APP_ENV", EnvironmentTest)
	t.Setenv("HTTP_READ_TIMEOUT", "0s")
	if _, err := Load(); err == nil {
		t.Fatal("Load() error = nil, want non-positive timeout error")
	}

	t.Setenv("HTTP_READ_TIMEOUT", "not-a-duration")
	if _, err := Load(); err == nil {
		t.Fatal("Load() error = nil, want duration parse error")
	}

	t.Setenv("HTTP_READ_TIMEOUT", "15s")
	t.Setenv("DATABASE_MIN_CONNS", "11")
	t.Setenv("DATABASE_MAX_CONNS", "10")
	if _, err := Load(); err == nil {
		t.Fatal("Load() error = nil, want invalid pool size error")
	}

	t.Setenv("DATABASE_MIN_CONNS", "2")
	t.Setenv("DATABASE_URL", "")
	if _, err := Load(); err == nil {
		t.Fatal("Load() error = nil, want missing DATABASE_URL error")
	}

	t.Setenv(
		"DATABASE_URL",
		"postgres://portfolio:portfolio@localhost:5432/portfolio?sslmode=disable",
	)
	t.Setenv("WEB_ORIGIN", "https://example.com/admin")
	if _, err := Load(); err == nil {
		t.Fatal("Load() error = nil, want invalid WEB_ORIGIN error")
	}

	t.Setenv("WEB_ORIGIN", "https://example.com")
	t.Setenv("AUTH_JWT_SECRET", "short")
	if _, err := Load(); err == nil {
		t.Fatal("Load() error = nil, want short JWT secret error")
	}

	t.Setenv(
		"AUTH_JWT_SECRET",
		"test-secret-that-is-at-least-32-bytes",
	)
	t.Setenv("APP_ENV", EnvironmentProduction)
	t.Setenv("WEB_ORIGIN", "http://example.com")
	if _, err := Load(); err == nil {
		t.Fatal("Load() error = nil, want production HTTPS origin error")
	}
}

func clearConfigEnvironment(t *testing.T) {
	t.Helper()
	for _, key := range []string{
		"APP_ENV",
		"HTTP_ADDR",
		"LOG_LEVEL",
		"DATABASE_URL",
		"DATABASE_MAX_CONNS",
		"DATABASE_MIN_CONNS",
		"DATABASE_CONNECT_TIMEOUT",
		"DATABASE_MAX_CONN_LIFETIME",
		"DATABASE_MAX_CONN_IDLE_TIME",
		"DATABASE_HEALTH_CHECK_PERIOD",
		"AUTH_JWT_SECRET",
		"AUTH_ISSUER",
		"AUTH_AUDIENCE",
		"WEB_ORIGIN",
		"HTTP_READ_HEADER_TIMEOUT",
		"HTTP_READ_TIMEOUT",
		"HTTP_WRITE_TIMEOUT",
		"HTTP_IDLE_TIMEOUT",
		"HTTP_SHUTDOWN_TIMEOUT",
	} {
		t.Setenv(key, "")
	}

	t.Setenv("APP_ENV", EnvironmentLocal)
	t.Setenv("HTTP_ADDR", ":8080")
	t.Setenv("LOG_LEVEL", "info")
	t.Setenv(
		"DATABASE_URL",
		"postgres://portfolio:portfolio@localhost:5432/portfolio?sslmode=disable",
	)
	t.Setenv("DATABASE_MAX_CONNS", "10")
	t.Setenv("DATABASE_MIN_CONNS", "2")
	t.Setenv("DATABASE_CONNECT_TIMEOUT", "5s")
	t.Setenv("DATABASE_MAX_CONN_LIFETIME", "30m")
	t.Setenv("DATABASE_MAX_CONN_IDLE_TIME", "5m")
	t.Setenv("DATABASE_HEALTH_CHECK_PERIOD", "1m")
	t.Setenv(
		"AUTH_JWT_SECRET",
		"test-secret-that-is-at-least-32-bytes",
	)
	t.Setenv("AUTH_ISSUER", "portfolio-api")
	t.Setenv("AUTH_AUDIENCE", "portfolio-admin")
	t.Setenv("WEB_ORIGIN", "http://localhost:3000")
	t.Setenv("HTTP_READ_HEADER_TIMEOUT", "5s")
	t.Setenv("HTTP_READ_TIMEOUT", "15s")
	t.Setenv("HTTP_WRITE_TIMEOUT", "30s")
	t.Setenv("HTTP_IDLE_TIMEOUT", "60s")
	t.Setenv("HTTP_SHUTDOWN_TIMEOUT", "10s")
}
