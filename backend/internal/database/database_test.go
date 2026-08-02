package database

import (
	"testing"
	"time"

	"github.com/M-Aidil-Fitrah/portofolio/backend/internal/config"
)

func TestPoolConfig(t *testing.T) {
	cfg, err := PoolConfig(config.DatabaseConfig{
		URL: "postgres://portfolio:secret@localhost:5432/portfolio" +
			"?sslmode=disable",
		MaxConns:          12,
		MinConns:          3,
		MaxConnLifetime:   45 * time.Minute,
		MaxConnIdleTime:   8 * time.Minute,
		HealthCheckPeriod: 30 * time.Second,
	})
	if err != nil {
		t.Fatalf("PoolConfig() error = %v", err)
	}

	if cfg.MaxConns != 12 || cfg.MinConns != 3 {
		t.Fatalf(
			"pool size = %d/%d, want 3/12",
			cfg.MinConns,
			cfg.MaxConns,
		)
	}
	if cfg.ConnConfig.Database != "portfolio" {
		t.Fatalf(
			"database = %q, want portfolio",
			cfg.ConnConfig.Database,
		)
	}
	if cfg.ConnConfig.Config.Password != "secret" {
		t.Fatal("password was not parsed")
	}
}

func TestPoolConfigRejectsInvalidURL(t *testing.T) {
	if _, err := PoolConfig(config.DatabaseConfig{
		URL: "postgres://%",
	}); err == nil {
		t.Fatal("PoolConfig() error = nil, want invalid URL error")
	}
}
