package auth

import (
	"context"
	"errors"
	"fmt"
	"net/netip"
	"strings"
	"time"

	"github.com/M-Aidil-Fitrah/portofolio/backend/internal/config"
	"github.com/M-Aidil-Fitrah/portofolio/backend/internal/database/dbgen"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	ErrInvalidCredentials = errors.New("invalid credentials")
	ErrInvalidSession     = errors.New("invalid session")
	ErrSessionExpired     = errors.New("session expired")
	ErrRefreshReuse       = errors.New("refresh token reuse detected")
)

type Metadata struct {
	UserAgent string
	IPAddress *netip.Addr
}

type Principal struct {
	SessionID     string
	UserID        string
	Email         string
	DisplayName   string
	IdleExpiresAt time.Time
}

type Session struct {
	AccessToken     string
	RefreshToken    string
	AccessExpiresAt time.Time
	IdleExpiresAt   time.Time
	Principal       Principal
}

type Service struct {
	pool              *pgxpool.Pool
	queries           *dbgen.Queries
	tokens            *tokenManager
	dummyPasswordHash string
	now               func() time.Time
}

func NewService(
	pool *pgxpool.Pool,
	cfg config.AuthConfig,
) (*Service, error) {
	dummyPasswordHash, err := HashPassword(
		"invalid-password-used-for-timing-equalization",
	)
	if err != nil {
		return nil, err
	}
	return &Service{
		pool:              pool,
		queries:           dbgen.New(pool),
		tokens:            newTokenManager(cfg.JWTSecret, cfg.Issuer, cfg.Audience),
		dummyPasswordHash: dummyPasswordHash,
		now:               time.Now,
	}, nil
}

func (s *Service) Login(
	ctx context.Context,
	email string,
	password string,
	metadata Metadata,
) (Session, error) {
	user, queryErr := s.queries.GetActiveAdminUserByEmail(
		ctx,
		strings.ToLower(strings.TrimSpace(email)),
	)

	passwordHash := s.dummyPasswordHash
	if queryErr == nil {
		passwordHash = user.PasswordHash
	} else if !errors.Is(queryErr, pgx.ErrNoRows) {
		return Session{}, fmt.Errorf("find admin user: %w", queryErr)
	}

	valid, verifyErr := VerifyPassword(passwordHash, password)
	if verifyErr != nil || queryErr != nil || !valid {
		return Session{}, ErrInvalidCredentials
	}

	now := s.now().UTC()
	sessionID, err := newUUID()
	if err != nil {
		return Session{}, err
	}
	accessJTI, err := newUUID()
	if err != nil {
		return Session{}, err
	}
	refreshToken, refreshHash, err := newRefreshToken()
	if err != nil {
		return Session{}, err
	}
	accessToken, accessExpiresAt, err := s.tokens.issue(
		user.ID.String(),
		sessionID.String(),
		accessJTI.String(),
	)
	if err != nil {
		return Session{}, err
	}

	idleExpiresAt := now.Add(IdleSessionTTL)
	absoluteExpiresAt := now.Add(AbsoluteSessionTTL)
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return Session{}, fmt.Errorf("begin login transaction: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	queries := dbgen.New(tx)
	if _, err := queries.CreateAuthSession(
		ctx,
		dbgen.CreateAuthSessionParams{
			SessionID:         sessionID,
			AdminUserID:       user.ID,
			RefreshTokenHash:  refreshHash,
			AccessJti:         accessJTI,
			IdleExpiresAt:     timestamp(idleExpiresAt),
			AbsoluteExpiresAt: timestamp(absoluteExpiresAt),
			UserAgent:         truncate(metadata.UserAgent, 512),
			IpAddress:         metadata.IPAddress,
		},
	); err != nil {
		return Session{}, fmt.Errorf("create auth session: %w", err)
	}
	if err := queries.MarkAdminLogin(ctx, user.ID); err != nil {
		return Session{}, fmt.Errorf("mark admin login: %w", err)
	}
	if err := tx.Commit(ctx); err != nil {
		return Session{}, fmt.Errorf("commit login transaction: %w", err)
	}

	return Session{
		AccessToken:     accessToken,
		RefreshToken:    refreshToken,
		AccessExpiresAt: accessExpiresAt,
		IdleExpiresAt:   idleExpiresAt,
		Principal: Principal{
			SessionID:     sessionID.String(),
			UserID:        user.ID.String(),
			Email:         user.Email,
			DisplayName:   user.DisplayName,
			IdleExpiresAt: idleExpiresAt,
		},
	}, nil
}

func (s *Service) Refresh(
	ctx context.Context,
	refreshToken string,
	metadata Metadata,
) (Session, error) {
	if strings.TrimSpace(refreshToken) == "" {
		return Session{}, ErrInvalidSession
	}
	refreshHash := hashRefreshToken(refreshToken)

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return Session{}, fmt.Errorf("begin refresh transaction: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()
	queries := dbgen.New(tx)

	current, err := queries.LockAuthSessionByRefreshHash(ctx, refreshHash)
	if errors.Is(err, pgx.ErrNoRows) {
		return Session{}, s.handleRefreshReuse(ctx, tx, queries, refreshHash)
	}
	if err != nil {
		return Session{}, fmt.Errorf("lock auth session: %w", err)
	}

	now := s.now().UTC()
	if current.RevokedAt.Valid ||
		current.DisabledAt.Valid ||
		!now.Before(current.IdleExpiresAt.Time) ||
		!now.Before(current.AbsoluteExpiresAt.Time) {
		reason := "expired"
		if _, err := queries.RevokeAuthSession(
			ctx,
			dbgen.RevokeAuthSessionParams{
				Reason:    &reason,
				SessionID: current.ID,
			},
		); err != nil {
			return Session{}, fmt.Errorf("revoke expired session: %w", err)
		}
		if err := tx.Commit(ctx); err != nil {
			return Session{}, fmt.Errorf("commit expired session: %w", err)
		}
		return Session{}, ErrSessionExpired
	}

	nextRefreshToken, nextRefreshHash, err := newRefreshToken()
	if err != nil {
		return Session{}, err
	}
	nextAccessJTI, err := newUUID()
	if err != nil {
		return Session{}, err
	}
	accessToken, accessExpiresAt, err := s.tokens.issue(
		current.AdminUserID.String(),
		current.ID.String(),
		nextAccessJTI.String(),
	)
	if err != nil {
		return Session{}, err
	}
	idleExpiresAt := minTime(
		now.Add(IdleSessionTTL),
		current.AbsoluteExpiresAt.Time,
	)

	if err := queries.RecordConsumedRefreshToken(
		ctx,
		dbgen.RecordConsumedRefreshTokenParams{
			TokenHash: refreshHash,
			SessionID: current.ID,
		},
	); err != nil {
		return Session{}, fmt.Errorf("record consumed refresh token: %w", err)
	}
	if _, err := queries.RotateAuthSession(
		ctx,
		dbgen.RotateAuthSessionParams{
			RefreshTokenHash: nextRefreshHash,
			AccessJti:        nextAccessJTI,
			IdleExpiresAt:    timestamp(idleExpiresAt),
			UserAgent:        truncate(metadata.UserAgent, 512),
			IpAddress:        metadata.IPAddress,
			SessionID:        current.ID,
		},
	); err != nil {
		return Session{}, fmt.Errorf("rotate auth session: %w", err)
	}
	if err := tx.Commit(ctx); err != nil {
		return Session{}, fmt.Errorf("commit refresh transaction: %w", err)
	}

	return Session{
		AccessToken:     accessToken,
		RefreshToken:    nextRefreshToken,
		AccessExpiresAt: accessExpiresAt,
		IdleExpiresAt:   idleExpiresAt,
		Principal: Principal{
			SessionID:     current.ID.String(),
			UserID:        current.AdminUserID.String(),
			Email:         current.Email,
			DisplayName:   current.DisplayName,
			IdleExpiresAt: idleExpiresAt,
		},
	}, nil
}

func (s *Service) Authenticate(
	ctx context.Context,
	accessToken string,
) (Principal, error) {
	claims, err := s.tokens.parse(accessToken)
	if err != nil {
		return Principal{}, ErrInvalidSession
	}
	sessionID, err := parseUUID(claims.SessionID)
	if err != nil {
		return Principal{}, ErrInvalidSession
	}
	accessJTI, err := parseUUID(claims.ID)
	if err != nil {
		return Principal{}, ErrInvalidSession
	}

	row, err := s.queries.GetActiveSessionPrincipal(
		ctx,
		dbgen.GetActiveSessionPrincipalParams{
			SessionID: sessionID,
			AccessJti: accessJTI,
		},
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return Principal{}, ErrInvalidSession
	}
	if err != nil {
		return Principal{}, fmt.Errorf("read auth session: %w", err)
	}
	if row.AdminUserID.String() != claims.Subject {
		return Principal{}, ErrInvalidSession
	}

	return Principal{
		SessionID:     row.SessionID.String(),
		UserID:        row.AdminUserID.String(),
		Email:         row.Email,
		DisplayName:   row.DisplayName,
		IdleExpiresAt: row.IdleExpiresAt.Time,
	}, nil
}

func (s *Service) Logout(
	ctx context.Context,
	accessToken string,
) error {
	claims, err := s.tokens.parse(accessToken)
	if err != nil {
		return ErrInvalidSession
	}
	sessionID, err := parseUUID(claims.SessionID)
	if err != nil {
		return ErrInvalidSession
	}
	reason := "logout"
	if _, err := s.queries.RevokeAuthSession(
		ctx,
		dbgen.RevokeAuthSessionParams{
			Reason:    &reason,
			SessionID: sessionID,
		},
	); err != nil {
		return fmt.Errorf("revoke auth session: %w", err)
	}
	return nil
}

func (s *Service) handleRefreshReuse(
	ctx context.Context,
	tx pgx.Tx,
	queries *dbgen.Queries,
	refreshHash []byte,
) error {
	sessionID, err := queries.FindSessionByConsumedRefreshHash(
		ctx,
		refreshHash,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return ErrInvalidSession
	}
	if err != nil {
		return fmt.Errorf("find consumed refresh token: %w", err)
	}

	reason := "refresh_reuse"
	if _, err := queries.RevokeAuthSession(
		ctx,
		dbgen.RevokeAuthSessionParams{
			Reason:    &reason,
			SessionID: sessionID,
		},
	); err != nil {
		return fmt.Errorf("revoke reused session: %w", err)
	}
	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit refresh reuse revocation: %w", err)
	}
	return ErrRefreshReuse
}

func timestamp(value time.Time) pgtype.Timestamptz {
	return pgtype.Timestamptz{Time: value, Valid: true}
}

func minTime(left, right time.Time) time.Time {
	if left.Before(right) {
		return left
	}
	return right
}

func truncate(value string, max int) string {
	if len(value) <= max {
		return value
	}
	return value[:max]
}
