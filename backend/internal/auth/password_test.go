package auth

import (
	"errors"
	"testing"
)

func TestPasswordHashRoundTrip(t *testing.T) {
	encoded, err := HashPassword("correct horse battery staple")
	if err != nil {
		t.Fatalf("HashPassword() error = %v", err)
	}

	valid, err := VerifyPassword(encoded, "correct horse battery staple")
	if err != nil {
		t.Fatalf("VerifyPassword() error = %v", err)
	}
	if !valid {
		t.Fatal("VerifyPassword() = false, want true")
	}

	valid, err = VerifyPassword(encoded, "wrong password")
	if err != nil {
		t.Fatalf("VerifyPassword(wrong) error = %v", err)
	}
	if valid {
		t.Fatal("VerifyPassword(wrong) = true, want false")
	}
}

func TestPasswordHashRejectsMalformedInput(t *testing.T) {
	valid, err := VerifyPassword("$argon2id$invalid", "password")
	if valid || !errors.Is(err, ErrInvalidPasswordHash) {
		t.Fatalf("VerifyPassword() = %v, %v", valid, err)
	}
}
