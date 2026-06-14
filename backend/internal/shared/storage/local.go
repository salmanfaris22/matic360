package storage

import (
	"fmt"
	"io"
	"mime/multipart"
	"os"
	"path/filepath"
	"strings"

	"github.com/google/uuid"
	"github.com/salman/distribution/internal/config"
)

// Local stores files on the server filesystem and serves them via a static route.
type Local struct {
	baseDir   string
	publicURL string
}

func NewLocal(cfg *config.Config) (*Local, error) {
	if err := os.MkdirAll(cfg.Storage.LocalDir, 0o755); err != nil {
		return nil, err
	}
	return &Local{
		baseDir:   cfg.Storage.LocalDir,
		publicURL: strings.TrimRight(cfg.Storage.PublicURL, "/"),
	}, nil
}

func (l *Local) Save(file *multipart.FileHeader, folder string) (string, error) {
	ext := filepath.Ext(file.Filename)
	name := fmt.Sprintf("%s%s", uuid.NewString(), ext)

	dir := filepath.Join(l.baseDir, folder)
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return "", err
	}

	src, err := file.Open()
	if err != nil {
		return "", err
	}
	defer src.Close()

	dstPath := filepath.Join(dir, name)
	dst, err := os.Create(dstPath)
	if err != nil {
		return "", err
	}
	defer dst.Close()

	if _, err := io.Copy(dst, src); err != nil {
		return "", err
	}

	return fmt.Sprintf("%s/%s/%s", l.publicURL, folder, name), nil
}

func (l *Local) Delete(publicURL string) error {
	idx := strings.Index(publicURL, l.publicURL)
	if idx < 0 {
		return nil // not ours; ignore
	}
	rel := strings.TrimPrefix(publicURL, l.publicURL)
	rel = strings.TrimLeft(rel, "/")
	path := filepath.Join(l.baseDir, rel)
	if err := os.Remove(path); err != nil && !os.IsNotExist(err) {
		return err
	}
	return nil
}
