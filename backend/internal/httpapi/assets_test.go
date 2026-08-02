package httpapi

import (
	"bytes"
	"context"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
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

// Public assets are delegated to storage; protected ones must be streamed.
func TestAssetContentSeparatesPublicRedirectFromAdminStream(t *testing.T) {
	const assetID = "bb45c698-a92a-452f-9e66-a75bab3d38d4"
	assets := &fakeAssetService{}
	router := NewRouter(Options{
		Environment: "test",
		Auth: &fakeAuthService{
			principal: testAuthSession().Principal,
		},
		Assets:    assets,
		WebOrigin: "http://localhost:3000",
	})

	public := performRequest(
		router,
		http.MethodGet,
		"/api/v1/assets/"+assetID+"/content?variant=delivery",
		"",
	)
	if public.Code != http.StatusTemporaryRedirect {
		t.Fatalf("public content status = %d, want 307", public.Code)
	}
	if cacheControl := public.Header().Get(
		"Cache-Control",
	); cacheControl != "public, max-age=31536000, immutable" {
		t.Fatalf("public cache-control = %q", cacheControl)
	}

	anonymous := performRequest(
		router,
		http.MethodGet,
		"/api/v1/admin/assets/"+assetID+"/content?variant=delivery",
		"",
	)
	if anonymous.Code != http.StatusUnauthorized {
		t.Fatalf("anonymous stream status = %d, want 401", anonymous.Code)
	}

	request := httptest.NewRequest(
		http.MethodGet,
		"/api/v1/admin/assets/"+assetID+"/content?variant=delivery",
		nil,
	)
	request.AddCookie(&http.Cookie{
		Name: accessCookieName, Value: "access-token",
	})
	admin := httptest.NewRecorder()
	router.ServeHTTP(admin, request)
	if admin.Code != http.StatusOK {
		t.Fatalf("admin stream status = %d: %s", admin.Code, admin.Body)
	}
	if admin.Body.String() != "protected-asset-bytes" {
		t.Fatalf("admin stream body = %q", admin.Body.String())
	}
	if !assets.openedPrivate || assets.openedVariant != "delivery" {
		t.Fatalf(
			"opened private = %v, variant = %q",
			assets.openedPrivate,
			assets.openedVariant,
		)
	}
	if cacheControl := admin.Header().Get(
		"Cache-Control",
	); cacheControl != "private, no-store" {
		t.Fatalf("admin cache-control = %q", cacheControl)
	}
	if contentType := admin.Header().Get(
		"Content-Type",
	); contentType != "image/webp" {
		t.Fatalf("admin content-type = %q", contentType)
	}

	ranged := httptest.NewRequest(
		http.MethodGet,
		"/api/v1/admin/assets/"+assetID+"/content?variant=delivery",
		nil,
	)
	ranged.Header.Set("Range", "bytes=0-8")
	ranged.AddCookie(&http.Cookie{
		Name: accessCookieName, Value: "access-token",
	})
	partial := httptest.NewRecorder()
	router.ServeHTTP(partial, ranged)
	if partial.Code != http.StatusPartialContent {
		t.Fatalf("range status = %d, want 206", partial.Code)
	}
	if partial.Body.String() != "protected" {
		t.Fatalf("range body = %q", partial.Body.String())
	}
}

type fakeAssetService struct {
	presigned     storage.PresignResult
	presignCalls  int
	contentErr    error
	openedVariant string
	openedPrivate bool
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

func (f *fakeAssetService) ContentURL(
	context.Context,
	string,
	string,
	bool,
) (string, error) {
	if f.contentErr != nil {
		return "", f.contentErr
	}
	return "https://storage.example.test/content", nil
}

func (f *fakeAssetService) OpenContent(
	_ context.Context,
	_ string,
	variant string,
	allowPrivate bool,
) (io.ReadSeekCloser, storage.ObjectInfo, error) {
	if f.contentErr != nil {
		return nil, storage.ObjectInfo{}, f.contentErr
	}
	f.openedVariant = variant
	f.openedPrivate = allowPrivate
	body := "protected-asset-bytes"
	return readSeekCloser{strings.NewReader(body)}, storage.ObjectInfo{
		ContentType: "image/webp",
		ETag:        "etag-value",
		Size:        int64(len(body)),
	}, nil
}

type readSeekCloser struct {
	*strings.Reader
}

func (readSeekCloser) Close() error { return nil }

var _ AssetService = (*fakeAssetService)(nil)
