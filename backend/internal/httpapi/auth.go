package httpapi

import (
	"errors"
	"net/http"
	"net/mail"
	"net/netip"
	"strconv"
	"strings"
	"time"

	"github.com/M-Aidil-Fitrah/portofolio/backend/internal/auth"
	"github.com/M-Aidil-Fitrah/portofolio/backend/internal/contract"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	openapi_types "github.com/oapi-codegen/runtime/types"
)

const (
	accessCookieName  = "portfolio_admin_access"
	refreshCookieName = "portfolio_admin_refresh"
)

func (s *server) LoginAdmin(c *gin.Context) {
	if !s.requireWebOrigin(c) {
		return
	}
	if s.auth == nil {
		respondError(
			c,
			http.StatusServiceUnavailable,
			"auth_unavailable",
			"Authentication is temporarily unavailable.",
		)
		return
	}
	rateKey := c.ClientIP()
	if allowed, retryAfter := s.loginRate.allow(rateKey); !allowed {
		c.Header(
			"Retry-After",
			strconv.Itoa(max(1, int(retryAfter.Seconds()))),
		)
		respondError(
			c,
			http.StatusTooManyRequests,
			"rate_limited",
			"Too many login attempts. Try again shortly.",
		)
		return
	}

	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, 4<<10)
	var request contract.AdminLoginRequest
	if err := c.ShouldBindJSON(&request); err != nil ||
		!validEmail(string(request.Email)) ||
		request.Password == "" ||
		len(request.Password) > 1024 {
		respondError(
			c,
			http.StatusBadRequest,
			"invalid_request",
			"Enter a valid email address and password.",
		)
		return
	}

	session, err := s.auth.Login(
		c.Request.Context(),
		string(request.Email),
		request.Password,
		requestMetadata(c),
	)
	if errors.Is(err, auth.ErrInvalidCredentials) {
		respondError(
			c,
			http.StatusUnauthorized,
			"invalid_credentials",
			"The email address or password is incorrect.",
		)
		return
	}
	if err != nil {
		respondError(
			c,
			http.StatusInternalServerError,
			"internal_error",
			"Authentication could not be completed.",
		)
		return
	}

	s.loginRate.reset(rateKey)
	setSessionCookies(c, session)
	c.JSON(http.StatusOK, sessionResponse(session.Principal))
}

func (s *server) RefreshAdminSession(c *gin.Context) {
	if !s.requireWebOrigin(c) {
		return
	}
	if s.auth == nil {
		clearSessionCookies(c)
		respondError(
			c,
			http.StatusServiceUnavailable,
			"auth_unavailable",
			"Authentication is temporarily unavailable.",
		)
		return
	}

	refreshToken, err := c.Cookie(refreshCookieName)
	if err != nil {
		clearSessionCookies(c)
		respondError(
			c,
			http.StatusUnauthorized,
			"invalid_session",
			"The administrator session is no longer valid.",
		)
		return
	}

	session, err := s.auth.Refresh(
		c.Request.Context(),
		refreshToken,
		requestMetadata(c),
	)
	if err != nil {
		if isSessionError(err) {
			clearSessionCookies(c)
			respondError(
				c,
				http.StatusUnauthorized,
				"invalid_session",
				"The administrator session is no longer valid.",
			)
		} else {
			respondError(
				c,
				http.StatusInternalServerError,
				"internal_error",
				"The session could not be refreshed.",
			)
		}
		return
	}

	setSessionCookies(c, session)
	c.JSON(http.StatusOK, sessionResponse(session.Principal))
}

func (s *server) LogoutAdmin(c *gin.Context) {
	if !s.requireWebOrigin(c) {
		return
	}
	accessToken, err := c.Cookie(accessCookieName)
	if err != nil || s.auth == nil {
		clearSessionCookies(c)
		respondError(
			c,
			http.StatusUnauthorized,
			"invalid_session",
			"The administrator session is no longer valid.",
		)
		return
	}
	if err := s.auth.Logout(c.Request.Context(), accessToken); err != nil {
		if isSessionError(err) {
			clearSessionCookies(c)
			respondError(
				c,
				http.StatusUnauthorized,
				"invalid_session",
				"The administrator session is no longer valid.",
			)
		} else {
			respondError(
				c,
				http.StatusInternalServerError,
				"internal_error",
				"The session could not be revoked.",
			)
		}
		return
	}

	clearSessionCookies(c)
	c.Status(http.StatusNoContent)
}

func (s *server) GetAdminSession(c *gin.Context) {
	accessToken, err := c.Cookie(accessCookieName)
	if err != nil || s.auth == nil {
		respondError(
			c,
			http.StatusUnauthorized,
			"invalid_session",
			"The administrator session is no longer valid.",
		)
		return
	}
	principal, err := s.auth.Authenticate(
		c.Request.Context(),
		accessToken,
	)
	if err != nil {
		if isSessionError(err) {
			respondError(
				c,
				http.StatusUnauthorized,
				"invalid_session",
				"The administrator session is no longer valid.",
			)
		} else {
			respondError(
				c,
				http.StatusInternalServerError,
				"internal_error",
				"The session could not be read.",
			)
		}
		return
	}

	c.JSON(http.StatusOK, sessionResponse(principal))
}

func (s *server) requireWebOrigin(c *gin.Context) bool {
	if c.GetHeader("Origin") != s.webOrigin {
		respondError(
			c,
			http.StatusForbidden,
			"invalid_origin",
			"The request origin is not allowed.",
		)
		return false
	}
	return true
}

func requestMetadata(c *gin.Context) auth.Metadata {
	var address *netip.Addr
	if parsed, err := netip.ParseAddr(c.ClientIP()); err == nil {
		address = &parsed
	}
	return auth.Metadata{
		UserAgent: c.Request.UserAgent(),
		IPAddress: address,
	}
}

func validEmail(value string) bool {
	value = strings.TrimSpace(value)
	if value == "" || len(value) > 254 {
		return false
	}
	parsed, err := mail.ParseAddress(value)
	return err == nil && parsed.Address == value
}

func isSessionError(err error) bool {
	return errors.Is(err, auth.ErrInvalidSession) ||
		errors.Is(err, auth.ErrSessionExpired) ||
		errors.Is(err, auth.ErrRefreshReuse) ||
		errors.Is(err, auth.ErrInvalidAccessToken)
}

func sessionResponse(principal auth.Principal) contract.AdminSession {
	return contract.AdminSession{
		ExpiresAt: principal.IdleExpiresAt,
		User: contract.AdminUser{
			DisplayName: principal.DisplayName,
			Email:       openapi_types.Email(principal.Email),
			ID:          uuid.MustParse(principal.UserID),
		},
	}
}

func setSessionCookies(c *gin.Context, session auth.Session) {
	setCookie(
		c,
		accessCookieName,
		session.AccessToken,
		"/api/v1/admin",
		session.AccessExpiresAt,
	)
	setCookie(
		c,
		refreshCookieName,
		session.RefreshToken,
		"/api/v1/admin/auth",
		session.IdleExpiresAt,
	)
}

func clearSessionCookies(c *gin.Context) {
	expired := time.Unix(1, 0).UTC()
	setCookie(c, accessCookieName, "", "/api/v1/admin", expired)
	setCookie(c, refreshCookieName, "", "/api/v1/admin/auth", expired)
}

func setCookie(
	c *gin.Context,
	name string,
	value string,
	path string,
	expires time.Time,
) {
	maxAge := int(time.Until(expires).Seconds())
	if value == "" || maxAge < 0 {
		maxAge = -1
	}
	http.SetCookie(c.Writer, &http.Cookie{
		Name:     name,
		Value:    value,
		Path:     path,
		Expires:  expires,
		MaxAge:   maxAge,
		HttpOnly: true,
		Secure:   true,
		SameSite: http.SameSiteLaxMode,
	})
}
