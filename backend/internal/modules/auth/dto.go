package auth

import "github.com/salman/distribution/internal/models"

// LoginRequest is the credentials payload.
type LoginRequest struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required,min=6"`
}

// RefreshRequest carries a refresh token to mint a new access token.
type RefreshRequest struct {
	RefreshToken string `json:"refresh_token" validate:"required"`
}

// AuthResponse is returned on successful login/refresh.
type AuthResponse struct {
	AccessToken  string       `json:"access_token"`
	RefreshToken string       `json:"refresh_token"`
	ExpiresIn    int64        `json:"expires_in"`
	User         *UserSummary `json:"user"`
}

// UserSummary is the safe user view embedded in auth responses.
type UserSummary struct {
	ID       uint   `json:"id"`
	Name     string `json:"name"`
	Email    string `json:"email"`
	Role     string `json:"role"`
	RoleName string `json:"role_name"`
	BranchID *uint  `json:"branch_id,omitempty"`
}

func newUserSummary(u *models.User) *UserSummary {
	s := &UserSummary{
		ID:       u.ID,
		Name:     u.Name,
		Email:    u.Email,
		BranchID: u.BranchID,
	}
	if u.Role != nil {
		s.Role = u.Role.Slug
		s.RoleName = u.Role.Name
	}
	return s
}
