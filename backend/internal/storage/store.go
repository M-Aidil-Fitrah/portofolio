package storage

import (
	"context"
	"fmt"
	"net/url"
	"time"

	"github.com/M-Aidil-Fitrah/portofolio/backend/internal/config"
	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
)

type ObjectInfo struct {
	Size        int64
	ContentType string
	ETag        string
}

type ObjectStore interface {
	PresignPut(context.Context, string, time.Duration) (*url.URL, error)
	Stat(context.Context, string) (ObjectInfo, error)
	Remove(context.Context, string) error
	Ready(context.Context) error
}

type MinioStore struct {
	client *minio.Client
	bucket string
}

func NewMinioStore(cfg config.StorageConfig) (*MinioStore, error) {
	client, err := minio.New(cfg.Endpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(cfg.AccessKey, cfg.SecretKey, ""),
		Secure: cfg.UseTLS,
		Region: cfg.Region,
	})
	if err != nil {
		return nil, fmt.Errorf("create object storage client: %w", err)
	}
	return &MinioStore{client: client, bucket: cfg.Bucket}, nil
}

func (s *MinioStore) PresignPut(
	ctx context.Context,
	objectKey string,
	expiry time.Duration,
) (*url.URL, error) {
	value, err := s.client.PresignedPutObject(
		ctx,
		s.bucket,
		objectKey,
		expiry,
	)
	if err != nil {
		return nil, fmt.Errorf("presign upload: %w", err)
	}
	return value, nil
}

func (s *MinioStore) Stat(
	ctx context.Context,
	objectKey string,
) (ObjectInfo, error) {
	value, err := s.client.StatObject(
		ctx,
		s.bucket,
		objectKey,
		minio.StatObjectOptions{},
	)
	if err != nil {
		return ObjectInfo{}, fmt.Errorf("stat object: %w", err)
	}
	return ObjectInfo{
		Size:        value.Size,
		ContentType: value.ContentType,
		ETag:        value.ETag,
	}, nil
}

func (s *MinioStore) Remove(
	ctx context.Context,
	objectKey string,
) error {
	if err := s.client.RemoveObject(
		ctx,
		s.bucket,
		objectKey,
		minio.RemoveObjectOptions{},
	); err != nil {
		return fmt.Errorf("remove object: %w", err)
	}
	return nil
}

func (s *MinioStore) Ready(ctx context.Context) error {
	exists, err := s.client.BucketExists(ctx, s.bucket)
	if err != nil {
		return fmt.Errorf("check storage bucket: %w", err)
	}
	if !exists {
		return fmt.Errorf("storage bucket %q does not exist", s.bucket)
	}
	return nil
}
