package httpapi

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestCORSAllowsConfiguredCredentialedOrigin(t *testing.T) {
	router := authTestRouter(&fakeAuthService{})
	request := httptest.NewRequest(
		http.MethodOptions,
		"/api/v1/admin/auth/login",
		nil,
	)
	request.Header.Set("Origin", "http://localhost:3000")
	request.Header.Set("Access-Control-Request-Method", http.MethodPost)
	response := httptest.NewRecorder()
	router.ServeHTTP(response, request)

	if response.Code != http.StatusNoContent {
		t.Fatalf("OPTIONS status = %d, want 204", response.Code)
	}
	if response.Header().Get("Access-Control-Allow-Origin") !=
		"http://localhost:3000" {
		t.Fatalf(
			"Allow-Origin = %q",
			response.Header().Get("Access-Control-Allow-Origin"),
		)
	}
	if response.Header().Get("Access-Control-Allow-Credentials") != "true" {
		t.Fatal("credentialed CORS was not enabled")
	}
}

func TestCORSDoesNotReflectUnknownOrigin(t *testing.T) {
	router := authTestRouter(&fakeAuthService{})
	request := httptest.NewRequest(
		http.MethodOptions,
		"/api/v1/admin/auth/login",
		nil,
	)
	request.Header.Set("Origin", "https://attacker.example")
	response := httptest.NewRecorder()
	router.ServeHTTP(response, request)

	if response.Header().Get("Access-Control-Allow-Origin") != "" {
		t.Fatalf(
			"Allow-Origin = %q, want empty",
			response.Header().Get("Access-Control-Allow-Origin"),
		)
	}
}
