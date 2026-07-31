package engagement

import (
	"context"
	"testing"
	"time"

	"github.com/M-Aidil-Fitrah/portofolio/backend/internal/activity"
	"github.com/M-Aidil-Fitrah/portofolio/backend/internal/testsupport"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

func TestServicePersistsLikesCommentsAndModeration(t *testing.T) {
	databaseURL := testsupport.DatabaseURL(t)
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	pool, err := pgxpool.New(ctx, databaseURL)
	if err != nil {
		t.Fatal(err)
	}
	defer pool.Close()
	testsupport.ResetDatabase(t, ctx, pool)

	activityService := activity.NewService(pool)
	created, err := activityService.Create(ctx, activity.WriteInput{
		Title:    activity.LocalizedText{ID: "Aktivitas", EN: "Activity"},
		Category: "project",
		Date:     time.Date(2026, 7, 31, 0, 0, 0, 0, time.UTC),
		Status:   "published",
	})
	if err != nil {
		t.Fatal(err)
	}
	service := NewService(pool)
	firstVisitor, secondVisitor := uuid.NewString(), uuid.NewString()
	if count, err := service.SetLike(
		ctx, *created.Slug, firstVisitor, true,
	); err != nil || count != 1 {
		t.Fatalf("first like = %d, %v", count, err)
	}
	if count, err := service.SetLike(
		ctx, *created.Slug, firstVisitor, true,
	); err != nil || count != 1 {
		t.Fatalf("idempotent like = %d, %v", count, err)
	}
	if count, err := service.SetLike(
		ctx, *created.Slug, secondVisitor, true,
	); err != nil || count != 2 {
		t.Fatalf("second like = %d, %v", count, err)
	}
	if count, err := service.SetLike(
		ctx, *created.Slug, firstVisitor, false,
	); err != nil || count != 1 {
		t.Fatalf("unlike = %d, %v", count, err)
	}

	first, err := service.CreateComment(
		ctx, *created.Slug, " Visitor ", " First comment ",
	)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := service.CreateComment(
		ctx, *created.Slug, "Second", "Second comment",
	); err != nil {
		t.Fatal(err)
	}
	snapshot, err := service.Get(
		ctx, *created.Slug, secondVisitor, 20, 0,
	)
	if err != nil {
		t.Fatal(err)
	}
	if snapshot.Likes != 1 || !snapshot.Liked ||
		snapshot.CommentTotal != 2 || len(snapshot.Comments) != 2 {
		t.Fatalf("snapshot = %#v", snapshot)
	}
	hidden, err := service.Moderate(ctx, first.ID, "hidden")
	if err != nil || hidden.Status != "hidden" {
		t.Fatalf("Moderate() = %#v, %v", hidden, err)
	}
	snapshot, err = service.Get(
		ctx, *created.Slug, secondVisitor, 20, 0,
	)
	if err != nil || snapshot.CommentTotal != 1 {
		t.Fatalf("hidden snapshot = %#v, %v", snapshot, err)
	}
	admin, err := service.ListAdmin(ctx, &created.ID, nil, 20, 0)
	if err != nil || admin.Total != 2 || len(admin.Items) != 2 {
		t.Fatalf("admin list = %#v, %v", admin, err)
	}
	if err := service.Delete(ctx, first.ID); err != nil {
		t.Fatal(err)
	}
	admin, err = service.ListAdmin(ctx, &created.ID, nil, 20, 0)
	if err != nil || admin.Total != 1 {
		t.Fatalf("admin list after delete = %#v, %v", admin, err)
	}
}
