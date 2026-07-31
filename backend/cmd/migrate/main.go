// Command migrate menjalankan migrasi database lewat sumber konfigurasi yang sama
// dengan cmd/api. Sebelumnya migrasi dijalankan oleh binary goose langsung dari
// Makefile dengan DATABASE_URL yang di-resolve terpisah — kalau env tidak terbaca,
// goose diam-diam jatuh ke koneksi default milik user OS dan bisa memigrasi
// database yang salah tanpa ada yang gagal.
package main

import (
	"context"
	"database/sql"
	"errors"
	"flag"
	"fmt"
	"log/slog"
	"os"
	"time"

	"github.com/M-Aidil-Fitrah/portofolio/backend/db"
	"github.com/M-Aidil-Fitrah/portofolio/backend/internal/config"
	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/pressly/goose/v3"
)

func main() {
	if err := run(); err != nil {
		slog.Error("migrate", "error", err)
		os.Exit(1)
	}
}

func run() error {
	urlEnv := flag.String(
		"url-env",
		"DATABASE_URL",
		"nama environment variable yang memuat URL database",
	)
	flag.Parse()

	command := flag.Arg(0)
	if command == "" {
		return errors.New(
			"usage: migrate [-url-env NAMA] <up|up-by-one|down|status|version|validate>",
		)
	}

	if err := config.LoadDotEnv(); err != nil {
		return fmt.Errorf("load .env: %w", err)
	}

	goose.SetBaseFS(db.Migrations)
	if err := goose.SetDialect("postgres"); err != nil {
		return fmt.Errorf("set dialect: %w", err)
	}

	// validate hanya membaca file migrasi, jadi sengaja tidak menyentuh database.
	if command == "validate" {
		migrations, err := goose.CollectMigrations(
			db.MigrationsDir,
			0,
			goose.MaxVersion,
		)
		if err != nil {
			return fmt.Errorf("collect migrations: %w", err)
		}
		fmt.Printf("%d migration(s) valid\n", len(migrations))
		return nil
	}

	databaseURL, err := config.LoadDatabaseURLFrom(*urlEnv)
	if err != nil {
		return err
	}

	pool, err := sql.Open("pgx", databaseURL)
	if err != nil {
		return fmt.Errorf("open database: %w", err)
	}
	defer pool.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
	defer cancel()
	if err := pool.PingContext(ctx); err != nil {
		return fmt.Errorf("connect to database: %w", err)
	}

	if err := goose.RunContext(
		ctx,
		command,
		pool,
		db.MigrationsDir,
		flag.Args()[1:]...,
	); err != nil {
		return fmt.Errorf("run %s: %w", command, err)
	}
	return nil
}
