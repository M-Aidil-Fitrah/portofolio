package config

import (
	"errors"
	"fmt"
	"log/slog"
	"net/url"
	"os"
	"strconv"
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
	Database          DatabaseConfig
	Auth              AuthConfig
	ReadHeaderTimeout time.Duration
	ReadTimeout       time.Duration
	WriteTimeout      time.Duration
	IdleTimeout       time.Duration
	ShutdownTimeout   time.Duration
}

type AuthConfig struct {
	JWTSecret string
	Issuer    string
	Audience  string
	WebOrigin string
}

type DatabaseConfig struct {
	URL               string
	MaxConns          int32
	MinConns          int32
	ConnectTimeout    time.Duration
	MaxConnLifetime   time.Duration
	MaxConnIdleTime   time.Duration
	HealthCheckPeriod time.Duration
}

func Load() (Config, error) {
	cfg := Config{
		Environment: strings.ToLower(envOrDefault("APP_ENV", EnvironmentLocal)),
		HTTPAddr:    envOrDefault("HTTP_ADDR", ":8080"),
		Database: DatabaseConfig{
			URL: strings.TrimSpace(os.Getenv("DATABASE_URL")),
		},
		Auth: AuthConfig{
			JWTSecret: strings.TrimSpace(os.Getenv("AUTH_JWT_SECRET")),
			Issuer:    envOrDefault("AUTH_ISSUER", "portfolio-api"),
			Audience:  envOrDefault("AUTH_AUDIENCE", "portfolio-admin"),
			WebOrigin: strings.TrimSpace(os.Getenv("WEB_ORIGIN")),
		},
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
	if cfg.Database.URL == "" {
		return Config{}, errors.New("DATABASE_URL is required")
	}
	if len(cfg.Auth.JWTSecret) < 32 {
		return Config{}, errors.New(
			"AUTH_JWT_SECRET must contain at least 32 bytes",
		)
	}
	if cfg.Auth.Issuer == "" {
		return Config{}, errors.New("AUTH_ISSUER cannot be empty")
	}
	if cfg.Auth.Audience == "" {
		return Config{}, errors.New("AUTH_AUDIENCE cannot be empty")
	}
	if err := validateWebOrigin(cfg.Auth.WebOrigin); err != nil {
		return Config{}, err
	}
	if cfg.Environment == EnvironmentProduction &&
		!strings.HasPrefix(cfg.Auth.WebOrigin, "https://") {
		return Config{}, errors.New(
			"WEB_ORIGIN must use https in production",
		)
	}

	if err := cfg.LogLevel.UnmarshalText(
		[]byte(strings.ToLower(envOrDefault("LOG_LEVEL", "info"))),
	); err != nil {
		return Config{}, fmt.Errorf("parse LOG_LEVEL: %w", err)
	}

	var err error
	if cfg.Database.MaxConns, err = positiveInt32(
		"DATABASE_MAX_CONNS",
		10,
	); err != nil {
		return Config{}, err
	}
	if cfg.Database.MinConns, err = nonNegativeInt32(
		"DATABASE_MIN_CONNS",
		2,
	); err != nil {
		return Config{}, err
	}
	if cfg.Database.MinConns > cfg.Database.MaxConns {
		return Config{}, errors.New(
			"DATABASE_MIN_CONNS cannot exceed DATABASE_MAX_CONNS",
		)
	}
	if cfg.Database.ConnectTimeout, err = duration(
		"DATABASE_CONNECT_TIMEOUT",
		5*time.Second,
	); err != nil {
		return Config{}, err
	}
	if cfg.Database.MaxConnLifetime, err = duration(
		"DATABASE_MAX_CONN_LIFETIME",
		30*time.Minute,
	); err != nil {
		return Config{}, err
	}
	if cfg.Database.MaxConnIdleTime, err = duration(
		"DATABASE_MAX_CONN_IDLE_TIME",
		5*time.Minute,
	); err != nil {
		return Config{}, err
	}
	if cfg.Database.HealthCheckPeriod, err = duration(
		"DATABASE_HEALTH_CHECK_PERIOD",
		time.Minute,
	); err != nil {
		return Config{}, err
	}
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

func positiveInt32(key string, fallback int32) (int32, error) {
	value, err := nonNegativeInt32(key, fallback)
	if err != nil {
		return 0, err
	}
	if value == 0 {
		return 0, fmt.Errorf("%s must be greater than zero", key)
	}
	return value, nil
}

func nonNegativeInt32(key string, fallback int32) (int32, error) {
	raw := envOrDefault(key, strconv.FormatInt(int64(fallback), 10))
	value, err := strconv.ParseInt(raw, 10, 32)
	if err != nil {
		return 0, fmt.Errorf("parse %s: %w", key, err)
	}
	if value < 0 {
		return 0, fmt.Errorf("%s cannot be negative", key)
	}
	return int32(value), nil
}

func validateWebOrigin(raw string) error {
	if raw == "" {
		return errors.New("WEB_ORIGIN is required")
	}
	parsed, err := url.Parse(raw)
	if err != nil {
		return fmt.Errorf("parse WEB_ORIGIN: %w", err)
	}
	if (parsed.Scheme != "http" && parsed.Scheme != "https") ||
		parsed.Host == "" ||
		parsed.User != nil ||
		parsed.RawQuery != "" ||
		parsed.Fragment != "" ||
		parsed.Path != "" {
		return errors.New(
			"WEB_ORIGIN must be an http(s) origin without path, query, or fragment",
		)
	}
	return nil
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
