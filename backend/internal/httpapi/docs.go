package httpapi

import (
	"encoding/json"
	"net/http"

	"github.com/M-Aidil-Fitrah/portofolio/backend/internal/config"
	"github.com/M-Aidil-Fitrah/portofolio/backend/internal/contract"
	"github.com/gin-gonic/gin"
)

const scalarHTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Portfolio Activity API</title>
  </head>
  <body>
    <div id="app"></div>
    <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference@1.63.0"></script>
    <script>
      Scalar.createApiReference("#app", {
        url: "/openapi.json",
        theme: "saturn",
        layout: "modern",
        darkMode: true,
        hideDarkModeToggle: true,
        defaultHttpClient: {
          targetKey: "shell",
          clientKey: "curl"
        }
      })
    </script>
  </body>
</html>`

func registerDocumentation(router *gin.Engine, environment string) {
	if environment != config.EnvironmentLocal &&
		environment != config.EnvironmentStaging {
		return
	}

	spec, err := contract.GetSwagger()
	if err != nil {
		panic("parse embedded OpenAPI contract: " + err.Error())
	}
	document, err := json.Marshal(spec)
	if err != nil {
		panic("encode embedded OpenAPI contract: " + err.Error())
	}

	router.GET("/openapi.json", func(c *gin.Context) {
		c.Header("Cache-Control", "no-store")
		c.Data(http.StatusOK, "application/json; charset=utf-8", document)
	})
	router.GET("/docs", func(c *gin.Context) {
		c.Header("Cache-Control", "no-store")
		c.Data(
			http.StatusOK,
			"text/html; charset=utf-8",
			[]byte(scalarHTML),
		)
	})
}
