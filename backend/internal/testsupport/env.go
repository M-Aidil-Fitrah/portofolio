// Package testsupport menyediakan akses environment untuk integration test.
package testsupport

import (
	"os"
	"strings"
	"sync"
	"testing"

	"github.com/M-Aidil-Fitrah/portofolio/backend/internal/config"
)

var loadOnce sync.Once

// DatabaseURL mengembalikan TEST_DATABASE_URL dari environment atau backend/.env.
func DatabaseURL(t *testing.T) string {
	t.Helper()
	return requireEnv(t, "TEST_DATABASE_URL")
}

// StorageConfig mengembalikan konfigurasi storage test; bucket-nya khusus test.
func StorageConfig(t *testing.T) config.StorageConfig {
	t.Helper()
	return config.StorageConfig{
		Endpoint:  requireEnv(t, "TEST_STORAGE_ENDPOINT"),
		AccessKey: requireEnv(t, "TEST_STORAGE_ACCESS_KEY"),
		SecretKey: requireEnv(t, "TEST_STORAGE_SECRET_KEY"),
		Bucket:    requireEnv(t, "TEST_STORAGE_BUCKET"),
		Region:    "us-east-1",
	}
}

func requireEnv(t *testing.T, key string) string {
	t.Helper()
	loadOnce.Do(func() {
		if err := config.LoadDotEnv(); err != nil {
			t.Fatalf("load .env: %v", err)
		}
	})
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		t.Fatalf(
			"%s is not set — isi di backend/.env (lihat backend/.env.example) "+
				"atau export di CI",
			key,
		)
	}
	return value
}
