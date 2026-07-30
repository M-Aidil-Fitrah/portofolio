package httpapi

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

func corsMiddleware(webOrigin string) gin.HandlerFunc {
	return func(c *gin.Context) {
		if c.GetHeader("Origin") != webOrigin {
			c.Next()
			return
		}

		c.Header("Access-Control-Allow-Origin", webOrigin)
		c.Header("Access-Control-Allow-Credentials", "true")
		c.Header(
			"Access-Control-Allow-Headers",
			"Content-Type, X-Request-ID",
		)
		c.Header(
			"Access-Control-Allow-Methods",
			"GET, POST, PUT, PATCH, DELETE, OPTIONS",
		)
		c.Header("Vary", "Origin")

		if c.Request.Method == http.MethodOptions {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}
		c.Next()
	}
}
