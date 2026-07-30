package httpapi

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/M-Aidil-Fitrah/portofolio/backend/internal/auth"
)

func TestAdminLoginSetsSecureRotatingCookies(t *testing.T) {
	session := testAuthSession()
	service := &fakeAuthService{loginSession: session}
	router := authTestRouter(service)

	request := httptest.NewRequest(
		http.MethodPost,
		"/api/v1/admin/auth/login",
		bytes.NewBufferString(
			`{"email":"admin@example.com","password":"secret"}`,
		),
	)
	request.Header.Set("Content-Type", "application/json")
	request.Header.Set("Origin", "http://localhost:3000")
	response := httptest.NewRecorder()
	router.ServeHTTP(response, request)

	if response.Code != http.StatusOK {
		t.Fatalf("POST login status = %d, want 200", response.Code)
	}
	if service.loginCalls != 1 {
		t.Fatalf("Login calls = %d, want 1", service.loginCalls)
	}

	cookies := response.Result().Cookies()
	if len(cookies) != 2 {
		t.Fatalf("Set-Cookie count = %d, want 2", len(cookies))
	}
	assertSessionCookie(
		t,
		cookies[0],
		accessCookieName,
		"/api/v1/admin",
	)
	assertSessionCookie(
		t,
		cookies[1],
		refreshCookieName,
		"/api/v1/admin/auth",
	)

	var body map[string]any
	decodeJSON(t, response, &body)
	user, ok := body["user"].(map[string]any)
	if !ok || user["email"] != "admin@example.com" {
		t.Fatalf("login body = %#v", body)
	}
}

func TestAdminAuthRejectsInvalidOrigin(t *testing.T) {
	service := &fakeAuthService{loginSession: testAuthSession()}
	router := authTestRouter(service)
	request := httptest.NewRequest(
		http.MethodPost,
		"/api/v1/admin/auth/login",
		bytes.NewBufferString(
			`{"email":"admin@example.com","password":"secret"}`,
		),
	)
	request.Header.Set("Content-Type", "application/json")
	request.Header.Set("Origin", "https://attacker.example")
	response := httptest.NewRecorder()
	router.ServeHTTP(response, request)

	if response.Code != http.StatusForbidden {
		t.Fatalf("POST login status = %d, want 403", response.Code)
	}
	if service.loginCalls != 0 {
		t.Fatalf("Login calls = %d, want 0", service.loginCalls)
	}
}

func TestAdminSessionLifecycleHandlers(t *testing.T) {
	session := testAuthSession()
	service := &fakeAuthService{
		refreshSession: session,
		principal:      session.Principal,
	}
	router := authTestRouter(service)

	refreshRequest := httptest.NewRequest(
		http.MethodPost,
		"/api/v1/admin/auth/refresh",
		nil,
	)
	refreshRequest.Header.Set("Origin", "http://localhost:3000")
	refreshRequest.AddCookie(&http.Cookie{
		Name:  refreshCookieName,
		Value: "old-refresh-token",
	})
	refreshResponse := httptest.NewRecorder()
	router.ServeHTTP(refreshResponse, refreshRequest)
	if refreshResponse.Code != http.StatusOK ||
		service.refreshToken != "old-refresh-token" {
		t.Fatalf(
			"refresh = %d token %q",
			refreshResponse.Code,
			service.refreshToken,
		)
	}

	sessionRequest := httptest.NewRequest(
		http.MethodGet,
		"/api/v1/admin/auth/session",
		nil,
	)
	sessionRequest.AddCookie(&http.Cookie{
		Name:  accessCookieName,
		Value: "access-token",
	})
	sessionResponse := httptest.NewRecorder()
	router.ServeHTTP(sessionResponse, sessionRequest)
	if sessionResponse.Code != http.StatusOK ||
		service.authToken != "access-token" {
		t.Fatalf(
			"session = %d token %q",
			sessionResponse.Code,
			service.authToken,
		)
	}

	logoutRequest := httptest.NewRequest(
		http.MethodPost,
		"/api/v1/admin/auth/logout",
		nil,
	)
	logoutRequest.Header.Set("Origin", "http://localhost:3000")
	logoutRequest.AddCookie(&http.Cookie{
		Name:  accessCookieName,
		Value: "access-token",
	})
	logoutResponse := httptest.NewRecorder()
	router.ServeHTTP(logoutResponse, logoutRequest)
	if logoutResponse.Code != http.StatusNoContent ||
		service.logoutToken != "access-token" {
		t.Fatalf(
			"logout = %d token %q",
			logoutResponse.Code,
			service.logoutToken,
		)
	}
	for _, cookie := range logoutResponse.Result().Cookies() {
		if cookie.MaxAge != -1 || cookie.Value != "" {
			t.Fatalf("cleared cookie = %#v", cookie)
		}
	}
}

func TestAdminRefreshMasksInvalidSession(t *testing.T) {
	service := &fakeAuthService{refreshErr: auth.ErrRefreshReuse}
	router := authTestRouter(service)
	request := httptest.NewRequest(
		http.MethodPost,
		"/api/v1/admin/auth/refresh",
		nil,
	)
	request.Header.Set("Origin", "http://localhost:3000")
	request.AddCookie(&http.Cookie{
		Name:  refreshCookieName,
		Value: "reused-token",
	})
	response := httptest.NewRecorder()
	router.ServeHTTP(response, request)

	if response.Code != http.StatusUnauthorized {
		t.Fatalf("POST refresh status = %d, want 401", response.Code)
	}
	if strings.Contains(response.Body.String(), "reuse") {
		t.Fatalf("refresh response leaks reuse detail: %s", response.Body)
	}
}

func authTestRouter(service AuthService) http.Handler {
	return NewRouter(Options{
		Environment: "test",
		Build: BuildInfo{
			Version: "test",
			Commit:  "test",
		},
		Auth:      service,
		WebOrigin: "http://localhost:3000",
	})
}

func testAuthSession() auth.Session {
	expiresAt := time.Now().Add(30 * time.Minute).UTC()
	return auth.Session{
		AccessToken:     "new-access-token",
		RefreshToken:    "new-refresh-token",
		AccessExpiresAt: time.Now().Add(10 * time.Minute).UTC(),
		IdleExpiresAt:   expiresAt,
		Principal: auth.Principal{
			SessionID:     "2668c4f1-9915-4638-8632-aea9c281734a",
			UserID:        "0e1e38ee-e935-48ef-8934-6ee1192b7b41",
			Email:         "admin@example.com",
			DisplayName:   "Admin",
			IdleExpiresAt: expiresAt,
		},
	}
}

func assertSessionCookie(
	t *testing.T,
	cookie *http.Cookie,
	name string,
	path string,
) {
	t.Helper()
	if cookie.Name != name ||
		cookie.Path != path ||
		!cookie.HttpOnly ||
		!cookie.Secure ||
		cookie.SameSite != http.SameSiteLaxMode {
		encoded, _ := json.Marshal(cookie)
		t.Fatalf("cookie = %s", encoded)
	}
}

type fakeAuthService struct {
	loginSession   auth.Session
	loginErr       error
	loginCalls     int
	refreshSession auth.Session
	refreshErr     error
	refreshToken   string
	principal      auth.Principal
	authErr        error
	authToken      string
	logoutErr      error
	logoutToken    string
}

func (f *fakeAuthService) Login(
	context.Context,
	string,
	string,
	auth.Metadata,
) (auth.Session, error) {
	f.loginCalls++
	return f.loginSession, f.loginErr
}

func (f *fakeAuthService) Refresh(
	_ context.Context,
	token string,
	_ auth.Metadata,
) (auth.Session, error) {
	f.refreshToken = token
	return f.refreshSession, f.refreshErr
}

func (f *fakeAuthService) Authenticate(
	_ context.Context,
	token string,
) (auth.Principal, error) {
	f.authToken = token
	return f.principal, f.authErr
}

func (f *fakeAuthService) Logout(
	_ context.Context,
	token string,
) error {
	f.logoutToken = token
	return f.logoutErr
}

var _ AuthService = (*fakeAuthService)(nil)
