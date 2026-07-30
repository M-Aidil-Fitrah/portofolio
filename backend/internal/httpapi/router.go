package httpapi

import (
	"context"
	"log/slog"
	"net/http"

	"github.com/gin-gonic/gin"
)

const serviceName = "portfolio-api"

type ReadinessCheck func(context.Context) error

type BuildInfo struct {
	Version string
	Commit  string
}

type Options struct {
	Environment string
	Logger      *slog.Logger
	Build       BuildInfo
	Readiness   ReadinessCheck
}

func NewRouter(options Options) *gin.Engine {
	if options.Logger == nil {
		options.Logger = slog.Default()
	}
	if options.Build.Version == "" {
		options.Build.Version = "dev"
	}
	if options.Build.Commit == "" {
		options.Build.Commit = "unknown"
	}
	if options.Readiness == nil {
		options.Readiness = func(context.Context) error { return nil }
	}

	if options.Environment == "production" ||
		options.Environment == "staging" {
		gin.SetMode(gin.ReleaseMode)
	}

	router := gin.New()
	_ = router.SetTrustedProxies(nil)
	router.HandleMethodNotAllowed = true
	router.Use(
		requestIDMiddleware(),
		securityHeadersMiddleware(),
		accessLogMiddleware(options.Logger),
		recoveryMiddleware(options.Logger),
	)

	router.GET("/healthz", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":  "ok",
			"service": serviceName,
			"version": options.Build.Version,
		})
	})
	router.GET("/readyz", func(c *gin.Context) {
		if err := options.Readiness(c.Request.Context()); err != nil {
			c.JSON(http.StatusServiceUnavailable, gin.H{
				"status":  "unavailable",
				"service": serviceName,
			})
			return
		}
		c.JSON(http.StatusOK, gin.H{
			"status":  "ready",
			"service": serviceName,
		})
	})

	api := router.Group("/api/v1")
	api.GET("", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"name":    serviceName,
			"version": options.Build.Version,
			"commit":  options.Build.Commit,
		})
	})

	router.NoRoute(func(c *gin.Context) {
		respondError(
			c,
			http.StatusNotFound,
			"not_found",
			"The requested resource was not found.",
		)
	})
	router.NoMethod(func(c *gin.Context) {
		respondError(
			c,
			http.StatusMethodNotAllowed,
			"method_not_allowed",
			"The request method is not allowed.",
		)
	})

	return router
}
