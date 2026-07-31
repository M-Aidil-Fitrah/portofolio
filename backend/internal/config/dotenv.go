package config

import (
	"os"
	"path/filepath"

	"github.com/joho/godotenv"
)

// LoadDotEnv memuat backend/.env ke environment proses supaya perintah lokal
// (`make run`, `make test`, `make migrate-up`, ...) tidak perlu export manual.
// Variabel yang sudah ada di environment tidak ditimpa, jadi environment asli
// (CI, container, `DATABASE_URL=... make ...`) tetap menang atas isi file.
// File yang tidak ada bukan error — di staging/production environment di-inject
// langsung oleh platform dan .env memang tidak ikut dikirim.
func LoadDotEnv() error {
	path, found := findDotEnv()
	if !found {
		return nil
	}
	return godotenv.Load(path)
}

// findDotEnv menelusuri cwd ke atas sampai module root. `go test` menjalankan tiap
// paket dengan cwd di direktori paket itu, jadi pencarian relatif saja tidak cukup —
// tanpa ini .env hanya kebaca oleh perintah yang dijalankan dari backend/.
func findDotEnv() (string, bool) {
	dir, err := os.Getwd()
	if err != nil {
		return "", false
	}
	for {
		candidate := filepath.Join(dir, ".env")
		if info, err := os.Stat(candidate); err == nil && !info.IsDir() {
			return candidate, true
		}
		if _, err := os.Stat(filepath.Join(dir, "go.mod")); err == nil {
			return "", false
		}
		parent := filepath.Dir(dir)
		if parent == dir {
			return "", false
		}
		dir = parent
	}
}
