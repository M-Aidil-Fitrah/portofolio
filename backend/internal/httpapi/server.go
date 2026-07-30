package httpapi

import (
	"net/http"

	"github.com/M-Aidil-Fitrah/portofolio/backend/internal/contract"
	"github.com/gin-gonic/gin"
)

type server struct {
	build     BuildInfo
	readiness ReadinessCheck
}

func newServer(options Options) *server {
	return &server{
		build:     options.Build,
		readiness: options.Readiness,
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
			Status:  contract.Unavailable,
		})
		return
	}

	c.JSON(http.StatusOK, contract.Readiness{
		Service: serviceName,
		Status:  contract.Ready,
	})
}

func (s *server) GetServiceInfo(c *gin.Context) {
	c.JSON(http.StatusOK, contract.ServiceInfo{
		Commit:  s.build.Commit,
		Name:    serviceName,
		Version: s.build.Version,
	})
}
