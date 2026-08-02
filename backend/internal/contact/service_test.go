package contact

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strings"
	"testing"

	"github.com/M-Aidil-Fitrah/portofolio/backend/internal/config"
)

func TestServiceSendsValidatedMessage(t *testing.T) {
	var authorization string
	var payload map[string]any
	client := &http.Client{Transport: roundTripFunc(
		func(request *http.Request) (*http.Response, error) {
			authorization = request.Header.Get("Authorization")
			if err := json.NewDecoder(request.Body).Decode(&payload); err != nil {
				t.Fatal(err)
			}
			return testResponse(http.StatusCreated), nil
		},
	)}
	service := NewService(config.ContactConfig{
		APIKey: "test-key", APIURL: "https://api.resend.test/emails",
		From: "Portfolio <contact@example.com>",
		To:   "owner@example.com",
	}, client)
	if err := service.Send(context.Background(), Message{
		Name: " Nadia ", Email: "nadia@example.com",
		Category: "collaboration", Body: " Build together ",
	}); err != nil {
		t.Fatal(err)
	}
	if authorization != "Bearer test-key" ||
		payload["reply_to"] != "nadia@example.com" ||
		payload["subject"] != "[Portfolio] New collaboration message" {
		t.Fatalf("authorization = %q, payload = %#v", authorization, payload)
	}
}

func TestServiceHoneypotAndFailures(t *testing.T) {
	calls := 0
	client := &http.Client{Transport: roundTripFunc(
		func(*http.Request) (*http.Response, error) {
			calls++
			return testResponse(http.StatusBadGateway), nil
		},
	)}
	service := NewService(config.ContactConfig{
		APIKey: "test-key", APIURL: "https://api.resend.test/emails",
		From: "contact@example.com", To: "owner@example.com",
	}, client)
	if err := service.Send(context.Background(), Message{
		Company: "bot", Name: "", Email: "", Body: "",
	}); err != nil || calls != 0 {
		t.Fatalf("honeypot = %v, calls = %d", err, calls)
	}
	if err := service.Send(context.Background(), Message{
		Name: "Nadia", Email: "invalid", Category: "general", Body: "Hi",
	}); !errors.Is(err, ErrInvalid) {
		t.Fatalf("invalid error = %v", err)
	}
	if err := service.Send(context.Background(), Message{
		Name: "Nadia", Email: "nadia@example.com",
		Category: "general", Body: "Hi",
	}); !errors.Is(err, ErrDelivery) {
		t.Fatalf("delivery error = %v", err)
	}
}

type roundTripFunc func(*http.Request) (*http.Response, error)

func (f roundTripFunc) RoundTrip(
	request *http.Request,
) (*http.Response, error) {
	return f(request)
}

func testResponse(status int) *http.Response {
	return &http.Response{
		StatusCode: status,
		Body:       io.NopCloser(strings.NewReader(`{}`)),
		Header:     make(http.Header),
	}
}
