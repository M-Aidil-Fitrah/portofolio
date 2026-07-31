package db_test

import (
	"context"
	"database/sql"
	"testing"
	"time"

	"github.com/M-Aidil-Fitrah/portofolio/backend/db"
	"github.com/M-Aidil-Fitrah/portofolio/backend/internal/testsupport"
	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/pressly/goose/v3"
)

// Migrations are only ever exercised in the up direction by the rest of the
// suite, so a Down section can rot unnoticed until a rollback is needed in
// production — the one moment it must work. This drives the full stack down
// and back up, then asserts the schema is actually reusable afterwards.
func TestMigrationsRollBackAndReapply(t *testing.T) {
	databaseURL := testsupport.DatabaseURL(t)
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
	defer cancel()

	pool, err := sql.Open("pgx", databaseURL)
	if err != nil {
		t.Fatalf("open database: %v", err)
	}
	defer pool.Close()

	goose.SetBaseFS(db.Migrations)
	if err := goose.SetDialect("postgres"); err != nil {
		t.Fatalf("set dialect: %v", err)
	}

	if err := goose.UpContext(ctx, pool, db.MigrationsDir); err != nil {
		t.Fatalf("initial up: %v", err)
	}
	applied, err := goose.GetDBVersion(pool)
	if err != nil {
		t.Fatalf("read version: %v", err)
	}
	if applied == 0 {
		t.Fatal("no migrations applied")
	}

	if err := goose.DownToContext(ctx, pool, db.MigrationsDir, 0); err != nil {
		t.Fatalf("down to zero: %v", err)
	}
	// A Down that drops its tables but leaks enums or indexes still reports
	// success, and only fails on the next up. Check the schema is really empty.
	for _, query := range []string{
		`SELECT COUNT(*) FROM pg_tables
		 WHERE schemaname = 'public' AND tablename <> 'goose_db_version'`,
		`SELECT COUNT(*) FROM pg_type
		 WHERE typnamespace = 'public'::regnamespace AND typtype = 'e'`,
	} {
		var remaining int
		if err := pool.QueryRowContext(ctx, query).Scan(&remaining); err != nil {
			t.Fatalf("inspect schema: %v", err)
		}
		if remaining != 0 {
			t.Fatalf("%d object(s) survived rollback: %s", remaining, query)
		}
	}

	if err := goose.UpContext(ctx, pool, db.MigrationsDir); err != nil {
		t.Fatalf("re-apply after rollback: %v", err)
	}
	reapplied, err := goose.GetDBVersion(pool)
	if err != nil {
		t.Fatalf("read version after re-apply: %v", err)
	}
	if reapplied != applied {
		t.Fatalf("version after re-apply = %d, want %d", reapplied, applied)
	}
}
