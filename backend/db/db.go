// Package db menyediakan file migrasi sebagai embedded FS supaya binary migrasi
// tidak bergantung pada layout direktori saat dijalankan.
package db

import "embed"

//go:embed migrations/*.sql
var Migrations embed.FS

// MigrationsDir adalah path di dalam Migrations, bukan path di disk.
const MigrationsDir = "migrations"
