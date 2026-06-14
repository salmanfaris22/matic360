package auth

import (
	"errors"

	"github.com/gofiber/fiber/v2"
	"github.com/salman/distribution/internal/middleware"
	"github.com/salman/distribution/internal/shared/response"
	"github.com/salman/distribution/internal/shared/validation"
)

// Handler exposes auth HTTP endpoints.
type Handler struct {
	svc *Service
}

func NewHandler(svc *Service) *Handler { return &Handler{svc: svc} }

func (h *Handler) Login(c *fiber.Ctx) error {
	var req LoginRequest
	if !validation.BindAndValidate(c, &req) {
		return nil
	}
	res, err := h.svc.Login(req.Email, req.Password)
	if err != nil {
		if errors.Is(err, ErrInvalidCredentials) {
			return response.Unauthorized(c, err.Error())
		}
		if errors.Is(err, ErrAccountDisabled) {
			return response.Forbidden(c, err.Error())
		}
		return response.Internal(c, "login failed")
	}
	return response.OK(c, res)
}

func (h *Handler) Refresh(c *fiber.Ctx) error {
	var req RefreshRequest
	if !validation.BindAndValidate(c, &req) {
		return nil
	}
	res, err := h.svc.Refresh(req.RefreshToken)
	if err != nil {
		return response.Unauthorized(c, "invalid refresh token")
	}
	return response.OK(c, res)
}

// Me returns the current authenticated user (protected route).
func (h *Handler) Me(c *fiber.Ctx) error {
	user := middleware.CurrentUser(c)
	if user == nil {
		return response.Unauthorized(c, "authentication required")
	}
	return response.OK(c, newUserSummary(user))
}

// Logout is a no-op for stateless JWT; the client discards its tokens.
func (h *Handler) Logout(c *fiber.Ctx) error {
	return response.OKMessage(c, "logged out", nil)
}
