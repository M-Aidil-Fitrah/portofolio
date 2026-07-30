package config

import (
	"errors"
	"fmt"
	"log/slog"
	"os"
	"strings"
	"time"
)

const (
	EnvironmentLocal      = "local"
	EnvironmentTest       = "test"
	EnvironmentStaging    = "staging"
	EnvironmentProduction = "production"
)

type Config struct {
	Environment       string
	HTTPAddr          string
	LogLevel          slog.Level
	ReadHeaderTimeout time.Duration
	ReadTimeout       time.Duration
	WriteTimeout      time.Duration
	IdleTimeout       time.Duration
	ShutdownTimeout   time.Duration
}

func Load() (Config, error) {
	cfg := Config{
		Environment: strings.ToLower(envOrDefault("APP_ENV", EnvironmentLocal)),
		HTTPAddr:    envOrDefault("HTTP_ADDR", ":8080"),
	}

	if !validEnvironment(cfg.Environment) {
		return Config{}, fmt.Errorf(
			"APP_ENV must be one of local, test, staging, or production: %q",
			cfg.Environment,
		)
	}
	if strings.TrimSpace(cfg.HTTPAddr) == "" {
		return Config{}, errors.New("HTTP_ADDR cannot be empty")
	}

	if err := cfg.LogLevel.UnmarshalText(
		[]byte(strings.ToLower(envOrDefault("LOG_LEVEL", "info"))),
	); err != nil {
		return Config{}, fmt.Errorf("parse LOG_LEVEL: %w", err)
	}

	var err error
	if cfg.ReadHeaderTimeout, err = duration(
		"HTTP_READ_HEADER_TIMEOUT",
		5*time.Second,
	); err != nil {
		return Config{}, err
	}
	if cfg.ReadTimeout, err = duration(
		"HTTP_READ_TIMEOUT",
		15*time.Second,
	); err != nil {
		return Config{}, err
	}
	if cfg.WriteTimeout, err = duration(
		"HTTP_WRITE_TIMEOUT",
		30*time.Second,
	); err != nil {
		return Config{}, err
	}
	if cfg.IdleTimeout, err = duration(
		"HTTP_IDLE_TIMEOUT",
		60*time.Second,
	); err != nil {
		return Config{}, err
	}
	if cfg.ShutdownTimeout, err = duration(
		"HTTP_SHUTDOWN_TIMEOUT",
		10*time.Second,
	); err != nil {
		return Config{}, err
	}

	return cfg, nil
}

func envOrDefault(key, fallback string) string {
	if value, ok := os.LookupEnv(key); ok {
		return strings.TrimSpace(value)
	}
	return fallback
}

func duration(key string, fallback time.Duration) (time.Duration, error) {
	raw := envOrDefault(key, fallback.String())
	value, err := time.ParseDuration(raw)
	if err != nil {
		return 0, fmt.Errorf("parse %s: %w", key, err)
	}
	if value <= 0 {
		return 0, fmt.Errorf("%s must be greater than zero", key)
	}
	return value, nil
}

func validEnvironment(value string) bool {
	switch value {
	case EnvironmentLocal,
		EnvironmentTest,
		EnvironmentStaging,
		EnvironmentProduction:
		return true
	default:
		return false
	}
}
