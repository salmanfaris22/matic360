package storage

import (
	"mime/multipart"

	"github.com/salman/distribution/internal/config"
)

// Storage abstracts file persistence so the app code never depends on a
// concrete backend. Swap local disk for S3/Spaces by changing STORAGE_DRIVER.
type Storage interface {
	// Save persists an uploaded file under the given logical folder
	// (e.g. "staff", "selfies") and returns a publicly reachable URL.
	Save(file *multipart.FileHeader, folder string) (string, error)
	// Delete removes a previously stored file by its public URL.
	Delete(publicURL string) error
}

// New returns the configured Storage driver. Falls back to local on unknown.
func New(cfg *config.Config) (Storage, error) {
	switch cfg.Storage.Driver {
	case "s3":
		return NewS3(cfg) // stub until cloud creds are provided
	default:
		return NewLocal(cfg)
	}
}
