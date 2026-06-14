package storage

import (
	"errors"
	"mime/multipart"

	"github.com/salman/distribution/internal/config"
)

// S3 is a placeholder for AWS S3 / DigitalOcean Spaces. The Storage interface
// is already wired through the app, so implementing these two methods with the
// AWS SDK is all that's needed to go to production — no call-site changes.
type S3 struct {
	cfg config.StorageConfig
}

func NewS3(cfg *config.Config) (*S3, error) {
	if cfg.Storage.S3Bucket == "" {
		return nil, errors.New("storage: STORAGE_DRIVER=s3 but S3_BUCKET is not set")
	}
	return &S3{cfg: cfg.Storage}, nil
}

func (s *S3) Save(file *multipart.FileHeader, folder string) (string, error) {
	// TODO: upload via aws-sdk-go-v2 and return the object URL.
	return "", errors.New("storage: S3 driver not implemented yet — add aws-sdk-go-v2 and credentials")
}

func (s *S3) Delete(publicURL string) error {
	return errors.New("storage: S3 driver not implemented yet")
}
