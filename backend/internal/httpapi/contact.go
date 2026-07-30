package httpapi

import (
	"errors"
	"net/http"

	"github.com/M-Aidil-Fitrah/portofolio/backend/internal/contact"
	"github.com/M-Aidil-Fitrah/portofolio/backend/internal/contract"
	"github.com/gin-gonic/gin"
)

func (s *server) SendContactMessage(c *gin.Context) {
	if !s.requireWebOrigin(c) {
		return
	}
	if s.contact == nil {
		contactUnavailable(c)
		return
	}
	visitorID := visitorIdentity(c)
	if allowed, retry := s.contactRate.allow(visitorID); !allowed {
		respondRateLimited(c, retry)
		return
	}
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, 16<<10)
	var request contract.ContactMessageRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		invalidContactRequest(c)
		return
	}
	err := s.contact.Send(c.Request.Context(), contact.Message{
		Name: request.Name, Email: string(request.Email),
		Category: string(request.Category),
		Body:     request.Message, Company: request.Company,
	})
	switch {
	case err == nil:
		c.JSON(http.StatusOK, contract.ContactMessageResponse{Ok: true})
	case errors.Is(err, contact.ErrInvalid):
		invalidContactRequest(c)
	case errors.Is(err, contact.ErrUnavailable):
		contactUnavailable(c)
	case errors.Is(err, contact.ErrDelivery):
		respondError(
			c,
			http.StatusBadGateway,
			"contact_delivery_failed",
			"Message delivery failed.",
		)
	default:
		respondError(
			c,
			http.StatusInternalServerError,
			"internal_error",
			"The contact request could not be completed.",
		)
	}
}

func invalidContactRequest(c *gin.Context) {
	respondError(
		c,
		http.StatusBadRequest,
		"invalid_contact",
		"Enter valid contact details.",
	)
}

func contactUnavailable(c *gin.Context) {
	respondError(
		c,
		http.StatusServiceUnavailable,
		"contact_unavailable",
		"Contact delivery is not configured.",
	)
}
