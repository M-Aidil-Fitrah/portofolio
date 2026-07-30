package httpapi

import (
	"context"
	"log/slog"
	"net/http"

	"github.com/M-Aidil-Fitrah/portofolio/backend/internal/contract"
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

	server := newServer(options)
	contract.RegisterHandlers(router, server)
	registerDocumentation(router, options.Environment)

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
