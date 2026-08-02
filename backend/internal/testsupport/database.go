package testsupport

import (
	"context"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
)

// ResetDatabase clears domain tables; packages share one database, so use -p 1.
func ResetDatabase(t *testing.T, ctx context.Context, pool *pgxpool.Pool) {
	t.Helper()
	if _, err := pool.Exec(
		ctx,
		`TRUNCATE TABLE activities, media_assets, admin_users
		 RESTART IDENTITY CASCADE`,
	); err != nil {
		t.Fatalf("reset database: %v", err)
	}
}
