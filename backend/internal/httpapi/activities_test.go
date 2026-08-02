package httpapi

import (
	"bytes"
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/M-Aidil-Fitrah/portofolio/backend/internal/activity"
)

func TestPublicAndAdminActivityBoundaries(t *testing.T) {
	item := testActivity()
	activities := &fakeActivityService{
		publicList: activity.ListResult{
			Items: []activity.Activity{item},
			Limit: 20,
			Total: 1,
		},
		created: item,
	}
	authService := &fakeAuthService{
		principal: testAuthSession().Principal,
	}
	router := NewRouter(Options{
		Environment: "test",
		Auth:        authService,
		Activities:  activities,
		WebOrigin:   "http://localhost:3000",
	})

	public := performRequest(
		router,
		http.MethodGet,
		"/api/v1/activities",
		"",
	)
	if public.Code != http.StatusOK || activities.publicListCalls != 1 {
		t.Fatalf(
			"public list = %d, calls %d",
			public.Code,
			activities.publicListCalls,
		)
	}

	unauthorized := performRequest(
		router,
		http.MethodGet,
		"/api/v1/admin/activities",
		"",
	)
	if unauthorized.Code != http.StatusUnauthorized {
		t.Fatalf("admin list status = %d, want 401", unauthorized.Code)
	}

	request := httptest.NewRequest(
		http.MethodPost,
		"/api/v1/admin/activities",
		bytes.NewBufferString(`{
			"title":{"id":"Judul","en":"Title"},
			"caption":{"id":"","en":""},
			"body":{"id":"","en":""},
			"category":"project",
			"date":"2026-07-31",
			"tags":[],
			"status":"draft",
			"pinned":false
		}`),
	)
	request.Header.Set("Content-Type", "application/json")
	request.Header.Set("Origin", "http://localhost:3000")
	request.AddCookie(&http.Cookie{
		Name:  accessCookieName,
		Value: "access-token",
	})
	response := httptest.NewRecorder()
	router.ServeHTTP(response, request)
	if response.Code != http.StatusCreated || activities.createCalls != 1 {
		t.Fatalf(
			"admin create = %d, calls %d: %s",
			response.Code,
			activities.createCalls,
			response.Body,
		)
	}
}

func testActivity() activity.Activity {
	slug := "judul"
	return activity.Activity{
		ID:   "0e1e38ee-e935-48ef-8934-6ee1192b7b41",
		Slug: &slug,
		Title: activity.LocalizedText{
			ID: "Judul",
			EN: "Title",
		},
		Caption:   activity.LocalizedText{},
		Body:      activity.LocalizedText{},
		Category:  "project",
		Date:      time.Date(2026, 7, 31, 0, 0, 0, 0, time.UTC),
		Tags:      []string{},
		Status:    "draft",
		Version:   1,
		CreatedAt: time.Now().UTC(),
		UpdatedAt: time.Now().UTC(),
	}
}

type fakeActivityService struct {
	publicList      activity.ListResult
	publicListCalls int
	created         activity.Activity
	createCalls     int
}

func (f *fakeActivityService) ListPublic(
	context.Context,
	activity.ListOptions,
) (activity.ListResult, error) {
	f.publicListCalls++
	return f.publicList, nil
}

func (f *fakeActivityService) GetPublic(
	context.Context,
	string,
) (activity.Activity, error) {
	return testActivity(), nil
}

func (f *fakeActivityService) ListAdmin(
	context.Context,
	activity.ListOptions,
) (activity.ListResult, error) {
	return f.publicList, nil
}

func (f *fakeActivityService) GetAdmin(
	context.Context,
	string,
) (activity.Activity, error) {
	return testActivity(), nil
}

func (f *fakeActivityService) Create(
	_ context.Context,
	_ activity.WriteInput,
) (activity.Activity, error) {
	f.createCalls++
	return f.created, nil
}

func (f *fakeActivityService) Update(
	context.Context,
	string,
	activity.WriteInput,
) (activity.Activity, error) {
	return f.created, nil
}

func (f *fakeActivityService) Delete(context.Context, string) error {
	return nil
}

var _ ActivityService = (*fakeActivityService)(nil)
