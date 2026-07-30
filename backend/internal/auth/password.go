package auth

import (
	"crypto/rand"
	"crypto/subtle"
	"encoding/base64"
	"errors"
	"fmt"
	"strconv"
	"strings"

	"golang.org/x/crypto/argon2"
)

const (
	passwordMemory      = 64 * 1024
	passwordIterations  = 3
	passwordParallelism = 2
	passwordSaltLength  = 16
	passwordKeyLength   = 32
)

var ErrInvalidPasswordHash = errors.New("invalid password hash")

func HashPassword(password string) (string, error) {
	salt := make([]byte, passwordSaltLength)
	if _, err := rand.Read(salt); err != nil {
		return "", fmt.Errorf("generate password salt: %w", err)
	}

	hash := argon2.IDKey(
		[]byte(password),
		salt,
		passwordIterations,
		passwordMemory,
		passwordParallelism,
		passwordKeyLength,
	)

	return fmt.Sprintf(
		"$argon2id$v=%d$m=%d,t=%d,p=%d$%s$%s",
		argon2.Version,
		passwordMemory,
		passwordIterations,
		passwordParallelism,
		base64.RawStdEncoding.EncodeToString(salt),
		base64.RawStdEncoding.EncodeToString(hash),
	), nil
}

func VerifyPassword(encodedHash, password string) (bool, error) {
	memory, iterations, parallelism, salt, expected, err :=
		parsePasswordHash(encodedHash)
	if err != nil {
		return false, err
	}

	actual := argon2.IDKey(
		[]byte(password),
		salt,
		iterations,
		memory,
		parallelism,
		uint32(len(expected)),
	)
	return subtle.ConstantTimeCompare(actual, expected) == 1, nil
}

func parsePasswordHash(
	encodedHash string,
) (uint32, uint32, uint8, []byte, []byte, error) {
	parts := strings.Split(encodedHash, "$")
	if len(parts) != 6 ||
		parts[1] != "argon2id" ||
		parts[2] != "v="+strconv.Itoa(argon2.Version) {
		return 0, 0, 0, nil, nil, ErrInvalidPasswordHash
	}

	var memory, iterations uint32
	var parallelism uint8
	if _, err := fmt.Sscanf(
		parts[3],
		"m=%d,t=%d,p=%d",
		&memory,
		&iterations,
		&parallelism,
	); err != nil {
		return 0, 0, 0, nil, nil, ErrInvalidPasswordHash
	}
	if memory == 0 ||
		memory > passwordMemory*2 ||
		iterations == 0 ||
		iterations > passwordIterations*2 ||
		parallelism == 0 ||
		parallelism > passwordParallelism*2 {
		return 0, 0, 0, nil, nil, ErrInvalidPasswordHash
	}

	salt, err := base64.RawStdEncoding.Strict().DecodeString(parts[4])
	if err != nil || len(salt) < 8 || len(salt) > 64 {
		return 0, 0, 0, nil, nil, ErrInvalidPasswordHash
	}
	expected, err := base64.RawStdEncoding.Strict().DecodeString(parts[5])
	if err != nil || len(expected) < 16 || len(expected) > 64 {
		return 0, 0, 0, nil, nil, ErrInvalidPasswordHash
	}

	return memory, iterations, parallelism, salt, expected, nil
}
