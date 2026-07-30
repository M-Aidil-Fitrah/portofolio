package auth

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"fmt"

	"github.com/jackc/pgx/v5/pgtype"
)

func newUUID() (pgtype.UUID, error) {
	var value [16]byte
	if _, err := rand.Read(value[:]); err != nil {
		return pgtype.UUID{}, fmt.Errorf("generate UUID: %w", err)
	}
	value[6] = (value[6] & 0x0f) | 0x40
	value[8] = (value[8] & 0x3f) | 0x80
	return pgtype.UUID{Bytes: value, Valid: true}, nil
}

func parseUUID(value string) (pgtype.UUID, error) {
	var parsed pgtype.UUID
	if err := parsed.Scan(value); err != nil {
		return pgtype.UUID{}, fmt.Errorf("parse UUID: %w", err)
	}
	return parsed, nil
}

func newRefreshToken() (string, []byte, error) {
	var value [32]byte
	if _, err := rand.Read(value[:]); err != nil {
		return "", nil, fmt.Errorf("generate refresh token: %w", err)
	}
	token := base64.RawURLEncoding.EncodeToString(value[:])
	return token, hashRefreshToken(token), nil
}

func hashRefreshToken(token string) []byte {
	value := sha256.Sum256([]byte(token))
	return value[:]
}
