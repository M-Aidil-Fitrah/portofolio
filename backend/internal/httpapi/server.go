package httpapi

import (
	"net/http"
	"time"

	"github.com/M-Aidil-Fitrah/portofolio/backend/internal/contract"
	"github.com/gin-gonic/gin"
)

type server struct {
	build       BuildInfo
	readiness   ReadinessCheck
	auth        AuthService
	activities  ActivityService
	assets      AssetService
	engagement  EngagementService
	contact     ContactService
	webOrigin   string
	loginRate   *fixedWindowLimiter
	likeRate    *fixedWindowLimiter
	commentRate *fixedWindowLimiter
	contactRate *fixedWindowLimiter
}

func newServer(options Options) *server {
	return &server{
		build:       options.Build,
		readiness:   options.Readiness,
		auth:        options.Auth,
		activities:  options.Activities,
		assets:      options.Assets,
		engagement:  options.Engagement,
		contact:     options.Contact,
		webOrigin:   options.WebOrigin,
		loginRate:   newFixedWindowLimiter(5, time.Minute),
		likeRate:    newFixedWindowLimiter(30, time.Minute),
		commentRate: newFixedWindowLimiter(5, time.Minute),
		contactRate: newFixedWindowLimiter(5, 10*time.Minute),
	}
}

func (s *server) GetHealth(c *gin.Context) {
	c.JSON(http.StatusOK, contract.Health{
		Service: serviceName,
		Status:  contract.Ok,
		Version: s.build.Version,
	})
}

func (s *server) GetReadiness(c *gin.Context) {
	if err := s.readiness(c.Request.Context()); err != nil {
		c.JSON(http.StatusServiceUnavailable, contract.Readiness{
			Service: serviceName,
			Status:  contract.ReadinessStatusUnavailable,
		})
		return
	}

	c.JSON(http.StatusOK, contract.Readiness{
		Service: serviceName,
		Status:  contract.ReadinessStatusReady,
	})
}

func (s *server) GetServiceInfo(c *gin.Context) {
	c.JSON(http.StatusOK, contract.ServiceInfo{
		Commit:  s.build.Commit,
		Name:    serviceName,
		Version: s.build.Version,
	})
}
