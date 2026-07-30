package httpapi

import (
	"bytes"
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/M-Aidil-Fitrah/portofolio/backend/internal/engagement"
)

func TestEngagementVisitorOriginAndAdminBoundaries(t *testing.T) {
	service := &fakeEngagementService{}
	router := NewRouter(Options{
		Environment: "test",
		Engagement:  service,
		Auth: &fakeAuthService{
			principal: testAuthSession().Principal,
		},
		WebOrigin: "http://localhost:3000",
	})
	response := performRequest(
		router,
		http.MethodGet,
		"/api/v1/activities/activity/engagement",
		"",
	)
	if response.Code != http.StatusOK ||
		service.getCalls != 1 ||
		len(response.Result().Cookies()) != 1 ||
		!response.Result().Cookies()[0].HttpOnly {
		t.Fatalf(
			"engagement = %d, calls %d, cookies %#v",
			response.Code,
			service.getCalls,
			response.Result().Cookies(),
		)
	}

	forbidden := httptest.NewRequest(
		http.MethodPut,
		"/api/v1/activities/activity/like",
		bytes.NewBufferString(`{"liked":true}`),
	)
	forbidden.Header.Set("Content-Type", "application/json")
	forbiddenResponse := httptest.NewRecorder()
	router.ServeHTTP(forbiddenResponse, forbidden)
	if forbiddenResponse.Code != http.StatusForbidden {
		t.Fatalf("like without origin = %d", forbiddenResponse.Code)
	}

	like := httptest.NewRequest(
		http.MethodPut,
		"/api/v1/activities/activity/like",
		bytes.NewBufferString(`{"liked":true}`),
	)
	like.Header.Set("Content-Type", "application/json")
	like.Header.Set("Origin", "http://localhost:3000")
	likeResponse := httptest.NewRecorder()
	router.ServeHTTP(likeResponse, like)
	if likeResponse.Code != http.StatusOK || service.likeCalls != 1 {
		t.Fatalf("like = %d, calls %d", likeResponse.Code, service.likeCalls)
	}

	admin := performRequest(
		router,
		http.MethodGet,
		"/api/v1/admin/comments",
		"",
	)
	if admin.Code != http.StatusUnauthorized {
		t.Fatalf("admin comments = %d", admin.Code)
	}
}

type fakeEngagementService struct {
	getCalls  int
	likeCalls int
}

func (f *fakeEngagementService) Get(
	context.Context,
	string,
	string,
	int32,
	int32,
) (engagement.Snapshot, error) {
	f.getCalls++
	return engagement.Snapshot{Comments: []engagement.Comment{}}, nil
}

func (f *fakeEngagementService) SetLike(
	context.Context,
	string,
	string,
	bool,
) (int64, error) {
	f.likeCalls++
	return 1, nil
}

func (f *fakeEngagementService) CreateComment(
	context.Context,
	string,
	string,
	string,
) (engagement.Comment, error) {
	return engagement.Comment{}, nil
}

func (f *fakeEngagementService) ListAdmin(
	context.Context,
	*string,
	*string,
	int32,
	int32,
) (engagement.AdminCommentList, error) {
	return engagement.AdminCommentList{Items: []engagement.Comment{}}, nil
}

func (f *fakeEngagementService) Moderate(
	context.Context,
	string,
	string,
) (engagement.Comment, error) {
	return engagement.Comment{}, nil
}

func (f *fakeEngagementService) Delete(context.Context, string) error {
	return nil
}

var _ EngagementService = (*fakeEngagementService)(nil)
