package auth

import (
	"errors"
	"time"

	"github.com/salman/distribution/internal/models"
	"github.com/salman/distribution/internal/shared/security"
	"gorm.io/gorm"
)

var (
	ErrInvalidCredentials = errors.New("invalid email or password")
	ErrAccountDisabled    = errors.New("account is disabled")
)

// Service holds auth business logic.
type Service struct {
	db *gorm.DB
	tm *security.TokenManager
}

func NewService(db *gorm.DB, tm *security.TokenManager) *Service {
	return &Service{db: db, tm: tm}
}

// Login verifies credentials and issues a token pair.
func (s *Service) Login(email, password string) (*AuthResponse, error) {
	var user models.User
	err := s.db.Preload("Role").Where("email = ?", email).First(&user).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrInvalidCredentials
		}
		return nil, err
	}
	if !security.CheckPassword(user.PasswordHash, password) {
		return nil, ErrInvalidCredentials
	}
	if !user.IsActive {
		return nil, ErrAccountDisabled
	}

	now := time.Now()
	s.db.Model(&user).Update("last_login_at", &now)

	return s.issue(&user)
}

// Refresh validates a refresh token and issues a new token pair.
func (s *Service) Refresh(refreshToken string) (*AuthResponse, error) {
	claims, err := s.tm.ParseRefresh(refreshToken)
	if err != nil {
		return nil, ErrInvalidCredentials
	}
	var user models.User
	if err := s.db.Preload("Role").First(&user, claims.UserID).Error; err != nil {
		return nil, ErrInvalidCredentials
	}
	if !user.IsActive {
		return nil, ErrAccountDisabled
	}
	return s.issue(&user)
}

func (s *Service) issue(user *models.User) (*AuthResponse, error) {
	roleSlug := ""
	if user.Role != nil {
		roleSlug = user.Role.Slug
	}
	pair, err := s.tm.Generate(user.ID, roleSlug)
	if err != nil {
		return nil, err
	}
	return &AuthResponse{
		AccessToken:  pair.AccessToken,
		RefreshToken: pair.RefreshToken,
		ExpiresIn:    pair.ExpiresIn,
		User:         newUserSummary(user),
	}, nil
}
