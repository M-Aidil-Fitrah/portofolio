package httpapi

import (
	"encoding/json"
	"net/http"
	"strings"
	"testing"

	"github.com/M-Aidil-Fitrah/portofolio/backend/internal/config"
)

func TestDocumentationAvailableInLocalEnvironment(t *testing.T) {
	router := testRouterForEnvironment(config.EnvironmentLocal)

	specResponse := performRequest(
		router,
		http.MethodGet,
		"/openapi.json",
		"",
	)
	if specResponse.Code != http.StatusOK {
		t.Fatalf(
			"GET /openapi.json status = %d, want 200",
			specResponse.Code,
		)
	}
	if contentType := specResponse.Header().Get("Content-Type"); !strings.Contains(
		contentType,
		"application/json",
	) {
		t.Fatalf("GET /openapi.json content type = %q", contentType)
	}

	var document struct {
		OpenAPI string                     `json:"openapi"`
		Paths   map[string]json.RawMessage `json:"paths"`
	}
	decodeJSON(t, specResponse, &document)
	if document.OpenAPI != "3.0.3" {
		t.Fatalf("OpenAPI version = %q, want 3.0.3", document.OpenAPI)
	}
	for _, path := range []string{"/healthz", "/readyz", "/api/v1"} {
		if _, exists := document.Paths[path]; !exists {
			t.Fatalf("OpenAPI path %q is missing", path)
		}
	}

	docsResponse := performRequest(router, http.MethodGet, "/docs", "")
	if docsResponse.Code != http.StatusOK {
		t.Fatalf("GET /docs status = %d, want 200", docsResponse.Code)
	}
	body := docsResponse.Body.String()
	if !strings.Contains(body, "@scalar/api-reference@1.63.0") ||
		!strings.Contains(body, `url: "/openapi.json"`) {
		t.Fatal("GET /docs does not contain pinned Scalar configuration")
	}
}

func TestDocumentationEnvironmentBoundary(t *testing.T) {
	staging := testRouterForEnvironment(config.EnvironmentStaging)
	if response := performRequest(
		staging,
		http.MethodGet,
		"/docs",
		"",
	); response.Code != http.StatusOK {
		t.Fatalf("staging GET /docs status = %d, want 200", response.Code)
	}

	for _, environment := range []string{
		config.EnvironmentTest,
		config.EnvironmentProduction,
	} {
		router := testRouterForEnvironment(environment)
		for _, path := range []string{"/openapi.json", "/docs"} {
			response := performRequest(router, http.MethodGet, path, "")
			if response.Code != http.StatusNotFound {
				t.Fatalf(
					"%s GET %s status = %d, want 404",
					environment,
					path,
					response.Code,
				)
			}
		}
	}
}
