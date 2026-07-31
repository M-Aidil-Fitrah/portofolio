package httpapi

import (
	"context"
	"io"
	"log/slog"
	"net/http"

	"github.com/M-Aidil-Fitrah/portofolio/backend/internal/activity"
	"github.com/M-Aidil-Fitrah/portofolio/backend/internal/auth"
	"github.com/M-Aidil-Fitrah/portofolio/backend/internal/contact"
	"github.com/M-Aidil-Fitrah/portofolio/backend/internal/contract"
	"github.com/M-Aidil-Fitrah/portofolio/backend/internal/engagement"
	"github.com/M-Aidil-Fitrah/portofolio/backend/internal/storage"
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
	Auth        AuthService
	Activities  ActivityService
	Assets      AssetService
	Engagement  EngagementService
	Contact     ContactService
	WebOrigin   string
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
	// No fallback on purpose: a default would let a misconfigured deployment
	// start and only fail in the user's browser.
	if options.WebOrigin == "" {
		panic("httpapi: WebOrigin is required (set WEB_ORIGIN)")
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
		corsMiddleware(options.WebOrigin),
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

type AuthService interface {
	Login(
		context.Context,
		string,
		string,
		auth.Metadata,
	) (auth.Session, error)
	Refresh(
		context.Context,
		string,
		auth.Metadata,
	) (auth.Session, error)
	Authenticate(context.Context, string) (auth.Principal, error)
	Logout(context.Context, string) error
}

type ActivityService interface {
	ListPublic(
		context.Context,
		activity.ListOptions,
	) (activity.ListResult, error)
	GetPublic(context.Context, string) (activity.Activity, error)
	ListAdmin(
		context.Context,
		activity.ListOptions,
	) (activity.ListResult, error)
	GetAdmin(context.Context, string) (activity.Activity, error)
	Create(context.Context, activity.WriteInput) (activity.Activity, error)
	Update(
		context.Context,
		string,
		activity.WriteInput,
	) (activity.Activity, error)
	Delete(context.Context, string) error
}

type AssetService interface {
	Presign(
		context.Context,
		storage.PresignInput,
	) (storage.PresignResult, error)
	Complete(context.Context, string) (storage.Asset, error)
	Get(context.Context, string) (storage.Asset, error)
	Delete(context.Context, string) error
	ContentURL(
		context.Context,
		string,
		string,
		bool,
	) (string, error)
	OpenContent(
		context.Context,
		string,
		string,
		bool,
	) (io.ReadSeekCloser, storage.ObjectInfo, error)
}

type EngagementService interface {
	Get(
		context.Context,
		string,
		string,
		int32,
		int32,
	) (engagement.Snapshot, error)
	SetLike(
		context.Context,
		string,
		string,
		bool,
	) (int64, error)
	CreateComment(
		context.Context,
		string,
		string,
		string,
	) (engagement.Comment, error)
	ListAdmin(
		context.Context,
		*string,
		*string,
		int32,
		int32,
	) (engagement.AdminCommentList, error)
	Moderate(
		context.Context,
		string,
		string,
	) (engagement.Comment, error)
	Delete(context.Context, string) error
}

type ContactService interface {
	Send(context.Context, contact.Message) error
}
