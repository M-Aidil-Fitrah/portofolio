package httpapi

import "github.com/gin-gonic/gin"

type errorBody struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

type errorResponse struct {
	Error     errorBody `json:"error"`
	RequestID string    `json:"request_id"`
}

func respondError(
	c *gin.Context,
	status int,
	code string,
	message string,
) {
	c.AbortWithStatusJSON(status, errorResponse{
		Error: errorBody{
			Code:    code,
			Message: message,
		},
		RequestID: requestIDFromContext(c),
	})
}
