package httpapi

import (
	"bytes"
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/M-Aidil-Fitrah/portofolio/backend/internal/storage"
)

func TestAdminAssetUploadBoundary(t *testing.T) {
	assets := &fakeAssetService{
		presigned: storage.PresignResult{
			Asset: storage.Asset{
				ID:        "bb45c698-a92a-452f-9e66-a75bab3d38d4",
				Kind:      "image",
				Status:    "uploading",
				Filename:  "portrait.png",
				MimeType:  "image/png",
				ByteSize:  2048,
				CreatedAt: time.Now().UTC(),
				UpdatedAt: time.Now().UTC(),
			},
			UploadURL: "https://storage.example.test/upload",
			ExpiresAt: time.Now().UTC().Add(15 * time.Minute),
		},
	}
	router := NewRouter(Options{
		Environment: "test",
		Auth: &fakeAuthService{
			principal: testAuthSession().Principal,
		},
		Assets:    assets,
		WebOrigin: "http://localhost:3000",
	})

	unauthorized := performRequest(
		router,
		http.MethodGet,
		"/api/v1/admin/assets/bb45c698-a92a-452f-9e66-a75bab3d38d4",
		"",
	)
	if unauthorized.Code != http.StatusUnauthorized {
		t.Fatalf("asset status = %d, want 401", unauthorized.Code)
	}

	request := httptest.NewRequest(
		http.MethodPost,
		"/api/v1/admin/assets/uploads",
		bytes.NewBufferString(`{
			"kind":"image",
			"filename":"portrait.png",
			"mime_type":"image/png",
			"byte_size":2048
		}`),
	)
	request.Header.Set("Content-Type", "application/json")
	request.Header.Set("Origin", "http://localhost:3000")
	request.AddCookie(&http.Cookie{
		Name: accessCookieName, Value: "access-token",
	})
	response := httptest.NewRecorder()
	router.ServeHTTP(response, request)
	if response.Code != http.StatusCreated || assets.presignCalls != 1 {
		t.Fatalf(
			"presign = %d, calls %d: %s",
			response.Code,
			assets.presignCalls,
			response.Body,
		)
	}
}

type fakeAssetService struct {
	presigned    storage.PresignResult
	presignCalls int
}

func (f *fakeAssetService) Presign(
	context.Context,
	storage.PresignInput,
) (storage.PresignResult, error) {
	f.presignCalls++
	return f.presigned, nil
}

func (f *fakeAssetService) Complete(
	context.Context,
	string,
) (storage.Asset, error) {
	return f.presigned.Asset, nil
}

func (f *fakeAssetService) Get(
	context.Context,
	string,
) (storage.Asset, error) {
	return f.presigned.Asset, nil
}

func (f *fakeAssetService) Delete(context.Context, string) error {
	return nil
}

var _ AssetService = (*fakeAssetService)(nil)
