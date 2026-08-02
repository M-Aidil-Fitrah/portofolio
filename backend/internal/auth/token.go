package auth

import (
	"errors"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

const (
	AccessTTL          = 10 * time.Minute
	IdleSessionTTL     = 30 * time.Minute
	AbsoluteSessionTTL = 24 * time.Hour
	accessTokenType    = "access"
)

var ErrInvalidAccessToken = errors.New("invalid access token")

type AccessClaims struct {
	SessionID string `json:"sid"`
	TokenType string `json:"token_type"`
	jwt.RegisteredClaims
}

func (c AccessClaims) Validate() error {
	if c.SessionID == "" || c.TokenType != accessTokenType {
		return ErrInvalidAccessToken
	}
	return nil
}

type tokenManager struct {
	secret   []byte
	issuer   string
	audience string
	now      func() time.Time
}

func newTokenManager(secret, issuer, audience string) *tokenManager {
	return &tokenManager{
		secret:   []byte(secret),
		issuer:   issuer,
		audience: audience,
		now:      time.Now,
	}
}

func (m *tokenManager) issue(
	userID string,
	sessionID string,
	jti string,
) (string, time.Time, error) {
	now := m.now().UTC()
	expiresAt := now.Add(AccessTTL)
	claims := AccessClaims{
		SessionID: sessionID,
		TokenType: accessTokenType,
		RegisteredClaims: jwt.RegisteredClaims{
			Audience:  jwt.ClaimStrings{m.audience},
			ExpiresAt: jwt.NewNumericDate(expiresAt),
			ID:        jti,
			IssuedAt:  jwt.NewNumericDate(now),
			Issuer:    m.issuer,
			NotBefore: jwt.NewNumericDate(now.Add(-5 * time.Second)),
			Subject:   userID,
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := token.SignedString(m.secret)
	if err != nil {
		return "", time.Time{}, fmt.Errorf("sign access token: %w", err)
	}
	return signed, expiresAt, nil
}

func (m *tokenManager) parse(raw string) (AccessClaims, error) {
	claims := AccessClaims{}
	token, err := jwt.ParseWithClaims(
		raw,
		&claims,
		func(token *jwt.Token) (any, error) {
			if token.Method != jwt.SigningMethodHS256 {
				return nil, ErrInvalidAccessToken
			}
			return m.secret, nil
		},
		jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Alg()}),
		jwt.WithIssuer(m.issuer),
		jwt.WithAudience(m.audience),
		jwt.WithExpirationRequired(),
		jwt.WithIssuedAt(),
		jwt.WithLeeway(5*time.Second),
		jwt.WithTimeFunc(m.now),
	)
	if err != nil || !token.Valid {
		return AccessClaims{}, fmt.Errorf(
			"%w: %v",
			ErrInvalidAccessToken,
			err,
		)
	}
	return claims, nil
}
