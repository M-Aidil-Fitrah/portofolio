package testsupport

import (
	"context"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
)

// ResetDatabase mengosongkan tabel domain supaya tiap integration test mulai dari
// keadaan yang sama.
//
// Tanpa ini test yang mengassert jumlah absolut ("total = 1") hanya lulus pada
// database yang baru dibuat, dan slug tetap seperti "aktivitas-indonesia" bentrok
// begitu test dijalankan dua kali. Membersihkan di awal, bukan di akhir, membuat
// test yang gagal di tengah tidak meracuni run berikutnya — dan menyisakan datanya
// untuk diperiksa.
//
// Semua paket integration test memakai TEST_DATABASE_URL yang sama, jadi `go test`
// wajib menjalankan paket secara serial (`-p 1`, lihat Makefile). Kalau paralel,
// truncate satu paket akan menghapus data paket lain di tengah jalan.
func ResetDatabase(t *testing.T, ctx context.Context, pool *pgxpool.Pool) {
	t.Helper()
	// CASCADE ikut mengosongkan tabel turunan: translations, tags, activity_assets,
	// asset_variants, comments, likes, processing_jobs, dan auth_sessions.
	if _, err := pool.Exec(
		ctx,
		`TRUNCATE TABLE activities, media_assets, admin_users
		 RESTART IDENTITY CASCADE`,
	); err != nil {
		t.Fatalf("reset database: %v", err)
	}
}
