package config

import (
	"os"
	"path/filepath"

	"github.com/joho/godotenv"
)

// LoadDotEnv loads backend/.env without overriding real environment variables.
func LoadDotEnv() error {
	path, found := findDotEnv()
	if !found {
		return nil
	}
	return godotenv.Load(path)
}

// findDotEnv walks up to the module root, because go test runs per package.
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
