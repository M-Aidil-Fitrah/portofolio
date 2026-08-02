package activity

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/M-Aidil-Fitrah/portofolio/backend/internal/testsupport"
	"github.com/jackc/pgx/v5/pgxpool"
)

func TestServiceCRUDAndStableSlug(t *testing.T) {
	databaseURL := testsupport.DatabaseURL(t)

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	pool, err := pgxpool.New(ctx, databaseURL)
	if err != nil {
		t.Fatalf("pgxpool.New() error = %v", err)
	}
	defer pool.Close()
	testsupport.ResetDatabase(t, ctx, pool)
	service := NewService(pool)

	created, err := service.Create(ctx, WriteInput{
		Title: LocalizedText{
			ID: "Aktivitas Indonesia",
			EN: "Indonesian Activity",
		},
		Caption:  LocalizedText{ID: "Ringkas", EN: "Summary"},
		Body:     LocalizedText{ID: "Isi", EN: "Body"},
		Category: "project",
		Date:     time.Date(2026, 7, 31, 0, 0, 0, 0, time.UTC),
		Tags:     []string{" Go ", "go", "PostgreSQL"},
		Status:   "published",
	})
	if err != nil {
		t.Fatalf("Create() error = %v", err)
	}
	if created.Slug == nil || *created.Slug != "aktivitas-indonesia" {
		t.Fatalf("created slug = %#v", created.Slug)
	}
	if len(created.Tags) != 2 {
		t.Fatalf("created tags = %#v", created.Tags)
	}

	public, err := service.ListPublic(ctx, ListOptions{})
	if err != nil {
		t.Fatalf("ListPublic() error = %v", err)
	}
	if public.Total != 1 || len(public.Items) != 1 {
		t.Fatalf("public result = %#v", public)
	}

	updated, err := service.Update(ctx, created.ID, WriteInput{
		Title: LocalizedText{
			ID: "Aktivitas Indonesia",
			EN: "Completely Different English Title",
		},
		Caption:  created.Caption,
		Body:     created.Body,
		Category: created.Category,
		Date:     created.Date,
		Tags:     created.Tags,
		Status:   created.Status,
		Version:  created.Version,
	})
	if err != nil {
		t.Fatalf("Update() error = %v", err)
	}
	if updated.Slug == nil || *updated.Slug != "aktivitas-indonesia" {
		t.Fatalf("updated slug = %#v", updated.Slug)
	}
	if updated.Version != created.Version+1 {
		t.Fatalf("updated version = %d", updated.Version)
	}

	if _, err := service.Update(ctx, created.ID, WriteInput{
		Title:    updated.Title,
		Caption:  updated.Caption,
		Body:     updated.Body,
		Category: updated.Category,
		Date:     updated.Date,
		Tags:     updated.Tags,
		Status:   updated.Status,
		Version:  created.Version,
	}); !errors.Is(err, ErrConflict) {
		t.Fatalf("stale Update() error = %v, want ErrConflict", err)
	}

	if err := service.Delete(ctx, created.ID); err != nil {
		t.Fatalf("Delete() error = %v", err)
	}
	if _, err := service.GetPublic(
		ctx,
		"aktivitas-indonesia",
	); !errors.Is(err, ErrNotFound) {
		t.Fatalf("GetPublic(deleted) error = %v", err)
	}
}
