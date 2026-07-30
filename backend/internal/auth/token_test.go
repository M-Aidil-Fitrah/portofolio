package auth

import (
	"errors"
	"testing"
	"time"
)

func TestAccessTokenRoundTrip(t *testing.T) {
	now := time.Date(2026, 7, 31, 0, 0, 0, 0, time.UTC)
	manager := newTokenManager(
		"test-secret-that-is-at-least-32-bytes",
		"portfolio-api",
		"portfolio-admin",
	)
	manager.now = func() time.Time { return now }

	token, expiresAt, err := manager.issue(
		"0e1e38ee-e935-48ef-8934-6ee1192b7b41",
		"2668c4f1-9915-4638-8632-aea9c281734a",
		"03e318d5-b350-4f6d-a3f0-7f2c2f12be03",
	)
	if err != nil {
		t.Fatalf("issue() error = %v", err)
	}
	if !expiresAt.Equal(now.Add(AccessTTL)) {
		t.Fatalf("expiresAt = %v", expiresAt)
	}

	claims, err := manager.parse(token)
	if err != nil {
		t.Fatalf("parse() error = %v", err)
	}
	if claims.SessionID != "2668c4f1-9915-4638-8632-aea9c281734a" ||
		claims.ID != "03e318d5-b350-4f6d-a3f0-7f2c2f12be03" {
		t.Fatalf("claims = %#v", claims)
	}
}

func TestAccessTokenRejectsWrongAudience(t *testing.T) {
	manager := newTokenManager(
		"test-secret-that-is-at-least-32-bytes",
		"portfolio-api",
		"portfolio-admin",
	)
	token, _, err := manager.issue(
		"0e1e38ee-e935-48ef-8934-6ee1192b7b41",
		"2668c4f1-9915-4638-8632-aea9c281734a",
		"03e318d5-b350-4f6d-a3f0-7f2c2f12be03",
	)
	if err != nil {
		t.Fatalf("issue() error = %v", err)
	}

	wrongAudience := newTokenManager(
		"test-secret-that-is-at-least-32-bytes",
		"portfolio-api",
		"different-audience",
	)
	if _, err := wrongAudience.parse(token); !errors.Is(
		err,
		ErrInvalidAccessToken,
	) {
		t.Fatalf("parse() error = %v, want ErrInvalidAccessToken", err)
	}
}
