package httpapi

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestHealthAndServiceRoutes(t *testing.T) {
	router := testRouter(nil)

	health := performRequest(router, http.MethodGet, "/healthz", "")
	if health.Code != http.StatusOK {
		t.Fatalf("GET /healthz status = %d, want 200", health.Code)
	}
	var healthBody map[string]string
	decodeJSON(t, health, &healthBody)
	if healthBody["status"] != "ok" ||
		healthBody["service"] != serviceName ||
		healthBody["version"] != "test" {
		t.Fatalf("GET /healthz body = %#v", healthBody)
	}

	service := performRequest(router, http.MethodGet, "/api/v1", "")
	if service.Code != http.StatusOK {
		t.Fatalf("GET /api/v1 status = %d, want 200", service.Code)
	}
	var serviceBody map[string]string
	decodeJSON(t, service, &serviceBody)
	if serviceBody["commit"] != "test-commit" {
		t.Fatalf("GET /api/v1 commit = %q", serviceBody["commit"])
	}
}

func TestReadinessFailure(t *testing.T) {
	router := testRouter(func(context.Context) error {
		return errors.New("dependency unavailable")
	})

	response := performRequest(router, http.MethodGet, "/readyz", "")
	if response.Code != http.StatusServiceUnavailable {
		t.Fatalf("GET /readyz status = %d, want 503", response.Code)
	}
	var body map[string]string
	decodeJSON(t, response, &body)
	if body["status"] != "unavailable" {
		t.Fatalf("GET /readyz body = %#v", body)
	}
}

func TestRequestIDAndNotFoundResponse(t *testing.T) {
	router := testRouter(nil)

	propagated := performRequest(
		router,
		http.MethodGet,
		"/healthz",
		"test-request-123",
	)
	if got := propagated.Header().Get(requestIDHeader); got != "test-request-123" {
		t.Fatalf("%s = %q, want propagated ID", requestIDHeader, got)
	}

	notFound := performRequest(router, http.MethodGet, "/missing", "bad id")
	generatedID := notFound.Header().Get(requestIDHeader)
	if !validRequestID.MatchString(generatedID) || generatedID == "bad id" {
		t.Fatalf("%s = %q, want generated valid ID", requestIDHeader, generatedID)
	}
	if notFound.Code != http.StatusNotFound {
		t.Fatalf("GET /missing status = %d, want 404", notFound.Code)
	}

	var body errorResponse
	decodeJSON(t, notFound, &body)
	if body.Error.Code != "not_found" || body.RequestID != generatedID {
		t.Fatalf("GET /missing body = %#v", body)
	}

	methodNotAllowed := performRequest(
		router,
		http.MethodPost,
		"/healthz",
		"method-check",
	)
	if methodNotAllowed.Code != http.StatusMethodNotAllowed {
		t.Fatalf(
			"POST /healthz status = %d, want 405",
			methodNotAllowed.Code,
		)
	}
	decodeJSON(t, methodNotAllowed, &body)
	if body.Error.Code != "method_not_allowed" {
		t.Fatalf("POST /healthz body = %#v", body)
	}
}

func testRouter(readiness ReadinessCheck) http.Handler {
	return testRouterForEnvironmentAndReadiness("test", readiness)
}

func testRouterForEnvironment(environment string) http.Handler {
	return testRouterForEnvironmentAndReadiness(environment, nil)
}

func testRouterForEnvironmentAndReadiness(
	environment string,
	readiness ReadinessCheck,
) http.Handler {
	return NewRouter(Options{
		Environment: environment,
		Logger: slog.New(
			slog.NewTextHandler(io.Discard, nil),
		),
		Build: BuildInfo{
			Version: "test",
			Commit:  "test-commit",
		},
		Readiness: readiness,
	})
}

func performRequest(
	handler http.Handler,
	method string,
	path string,
	requestID string,
) *httptest.ResponseRecorder {
	request := httptest.NewRequest(method, path, nil)
	if requestID != "" {
		request.Header.Set(requestIDHeader, requestID)
	}
	response := httptest.NewRecorder()
	handler.ServeHTTP(response, request)
	return response
}

func decodeJSON(
	t *testing.T,
	response *httptest.ResponseRecorder,
	target any,
) {
	t.Helper()
	if err := json.Unmarshal(response.Body.Bytes(), target); err != nil {
		t.Fatalf("decode response JSON: %v", err)
	}
}
