package httpapi

import (
	"bytes"
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/M-Aidil-Fitrah/portofolio/backend/internal/contact"
)

func TestContactOriginAndPayloadBoundary(t *testing.T) {
	service := &fakeContactService{}
	router := NewRouter(Options{
		Environment: "test",
		Contact:     service,
		WebOrigin:   "http://localhost:3000",
	})
	payload := `{
		"name":"Nadia",
		"email":"nadia@example.com",
		"category":"collaboration",
		"message":"Build together",
		"company":""
	}`
	forbidden := httptest.NewRequest(
		http.MethodPost,
		"/api/v1/contact",
		bytes.NewBufferString(payload),
	)
	forbidden.Header.Set("Content-Type", "application/json")
	forbiddenResponse := httptest.NewRecorder()
	router.ServeHTTP(forbiddenResponse, forbidden)
	if forbiddenResponse.Code != http.StatusForbidden {
		t.Fatalf("contact without origin = %d", forbiddenResponse.Code)
	}

	request := httptest.NewRequest(
		http.MethodPost,
		"/api/v1/contact",
		bytes.NewBufferString(payload),
	)
	request.Header.Set("Content-Type", "application/json")
	request.Header.Set("Origin", "http://localhost:3000")
	response := httptest.NewRecorder()
	router.ServeHTTP(response, request)
	if response.Code != http.StatusOK ||
		service.calls != 1 ||
		service.last.Email != "nadia@example.com" {
		t.Fatalf(
			"contact = %d, calls = %d, message = %#v",
			response.Code,
			service.calls,
			service.last,
		)
	}
}

type fakeContactService struct {
	calls int
	last  contact.Message
}

func (f *fakeContactService) Send(
	_ context.Context,
	message contact.Message,
) error {
	f.calls++
	f.last = message
	return nil
}

var _ ContactService = (*fakeContactService)(nil)
