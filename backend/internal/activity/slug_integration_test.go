package activity

import (
	"context"
	"strings"
	"testing"
	"time"

	"github.com/M-Aidil-Fitrah/portofolio/backend/internal/testsupport"
	"github.com/jackc/pgx/v5/pgxpool"
)

func slugTestService(t *testing.T) (*Service, context.Context) {
	t.Helper()
	databaseURL := testsupport.DatabaseURL(t)
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	t.Cleanup(cancel)
	pool, err := pgxpool.New(ctx, databaseURL)
	if err != nil {
		t.Fatalf("pgxpool.New() error = %v", err)
	}
	t.Cleanup(pool.Close)
	testsupport.ResetDatabase(t, ctx, pool)
	return NewService(pool), ctx
}

func publishedInput(title string, date time.Time) WriteInput {
	return WriteInput{
		Title:    LocalizedText{ID: title, EN: title},
		Category: "learning",
		Date:     date,
		Status:   "published",
	}
}

// A journal feed repeats titles, so derived slugs disambiguate silently.
func TestRepeatedTitleGetsADistinctSlug(t *testing.T) {
	service, ctx := slugTestService(t)
	first := time.Date(2026, 8, 1, 0, 0, 0, 0, time.UTC)

	one, err := service.Create(ctx, publishedInput("Catatan Minggu Ini", first))
	if err != nil {
		t.Fatalf("first Create() error = %v", err)
	}
	if *one.Slug != "catatan-minggu-ini" {
		t.Fatalf("first slug = %q", *one.Slug)
	}

	two, err := service.Create(ctx, publishedInput("Catatan Minggu Ini", first))
	if err != nil {
		t.Fatalf("second Create() error = %v", err)
	}
	if *two.Slug != "catatan-minggu-ini-2026-08-01" {
		t.Fatalf("second slug = %q", *two.Slug)
	}

	three, err := service.Create(ctx, publishedInput("Catatan Minggu Ini", first))
	if err != nil {
		t.Fatalf("third Create() error = %v", err)
	}
	if *three.Slug != "catatan-minggu-ini-2026-08-01-2" {
		t.Fatalf("third slug = %q", *three.Slug)
	}

	// Both remain reachable; disambiguation must not shadow the original.
	for _, slug := range []string{*one.Slug, *two.Slug, *three.Slug} {
		if _, err := service.GetPublic(ctx, slug); err != nil {
			t.Fatalf("GetPublic(%q) error = %v", slug, err)
		}
	}
}

// An explicit slug is the editor's decision, so a collision is reported.
func TestExplicitSlugCollisionIsReported(t *testing.T) {
	service, ctx := slugTestService(t)
	date := time.Date(2026, 8, 1, 0, 0, 0, 0, time.UTC)

	chosen := "catatan-pilihan"
	input := publishedInput("Judul Pertama", date)
	input.Slug = &chosen
	if _, err := service.Create(ctx, input); err != nil {
		t.Fatalf("Create() error = %v", err)
	}

	duplicate := publishedInput("Judul Kedua", date)
	duplicate.Slug = &chosen
	if _, err := service.Create(ctx, duplicate); err != ErrConflict {
		t.Fatalf("duplicate explicit slug error = %v, want ErrConflict", err)
	}
}

// Renaming must not strand links already shared under the old slug.
func TestRetiredSlugStillResolves(t *testing.T) {
	service, ctx := slugTestService(t)
	date := time.Date(2026, 8, 1, 0, 0, 0, 0, time.UTC)

	created, err := service.Create(ctx, publishedInput("Judul Awal", date))
	if err != nil {
		t.Fatalf("Create() error = %v", err)
	}
	original := *created.Slug

	renamed := "judul-yang-diperbarui"
	update := publishedInput("Judul Awal", date)
	update.Slug = &renamed
	update.Version = created.Version
	if _, err := service.Update(ctx, created.ID, update); err != nil {
		t.Fatalf("Update() error = %v", err)
	}

	retired, err := service.GetPublic(ctx, original)
	if err != nil {
		t.Fatalf("GetPublic(retired) error = %v", err)
	}
	// The response carries the current slug so the caller can redirect.
	if *retired.Slug != renamed {
		t.Fatalf("resolved slug = %q, want %q", *retired.Slug, renamed)
	}
	if retired.ID != created.ID {
		t.Fatalf("resolved a different activity")
	}

	// Renaming back must not leave the old redirect shadowing the live slug.
	back := publishedInput("Judul Awal", date)
	back.Slug = &original
	back.Version = retired.Version
	if _, err := service.Update(ctx, created.ID, back); err != nil {
		t.Fatalf("rename back error = %v", err)
	}
	restored, err := service.GetPublic(ctx, original)
	if err != nil {
		t.Fatalf("GetPublic(restored) error = %v", err)
	}
	if *restored.Slug != original {
		t.Fatalf("restored slug = %q, want %q", *restored.Slug, original)
	}
}

func TestSlugifyStaysWithinColumnWidth(t *testing.T) {
	long := strings.Repeat("panjang ", 30)
	if got := Slugify(long); len(got) > maxSlugLength {
		t.Fatalf("slug length = %d, want <= %d", len(got), maxSlugLength)
	}
}
