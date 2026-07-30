package httpapi

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"log/slog"
	"net/http"
	"regexp"
	"time"

	"github.com/gin-gonic/gin"
)

const (
	requestIDHeader = "X-Request-ID"
	requestIDKey    = "request_id"
)

var validRequestID = regexp.MustCompile(`^[A-Za-z0-9._-]{1,128}$`)

func requestIDMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		requestID := c.GetHeader(requestIDHeader)
		if !validRequestID.MatchString(requestID) {
			requestID = newRequestID()
		}

		c.Set(requestIDKey, requestID)
		c.Header(requestIDHeader, requestID)
		c.Next()
	}
}

func accessLogMiddleware(logger *slog.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		startedAt := time.Now()
		c.Next()

		logger.InfoContext(
			c.Request.Context(),
			"http request",
			"request_id", requestIDFromContext(c),
			"method", c.Request.Method,
			"path", c.Request.URL.Path,
			"status", c.Writer.Status(),
			"bytes", c.Writer.Size(),
			"duration", time.Since(startedAt),
			"client_ip", c.ClientIP(),
		)
	}
}

func recoveryMiddleware(logger *slog.Logger) gin.HandlerFunc {
	return gin.CustomRecovery(func(c *gin.Context, recovered any) {
		logger.ErrorContext(
			c.Request.Context(),
			"panic recovered",
			"request_id", requestIDFromContext(c),
			"panic", fmt.Sprint(recovered),
		)
		respondError(
			c,
			http.StatusInternalServerError,
			"internal_error",
			"An unexpected error occurred.",
		)
	})
}

func securityHeadersMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("X-Content-Type-Options", "nosniff")
		c.Header("X-Frame-Options", "DENY")
		c.Header("Referrer-Policy", "no-referrer")
		c.Next()
	}
}

func requestIDFromContext(c *gin.Context) string {
	value, exists := c.Get(requestIDKey)
	if !exists {
		return ""
	}
	requestID, _ := value.(string)
	return requestID
}

func newRequestID() string {
	var value [16]byte
	if _, err := rand.Read(value[:]); err == nil {
		return hex.EncodeToString(value[:])
	}
	return fmt.Sprintf("fallback-%d", time.Now().UnixNano())
}
