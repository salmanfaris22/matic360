package auth

import (
	"github.com/gofiber/fiber/v2"
)

// RegisterRoutes mounts auth endpoints. `protected` is the Auth middleware
// applied to routes that require a valid access token.
func RegisterRoutes(router fiber.Router, h *Handler, protected fiber.Handler) {
	grp := router.Group("/auth")
	grp.Post("/login", h.Login)
	grp.Post("/refresh", h.Refresh)
	grp.Post("/logout", h.Logout)
	grp.Get("/me", protected, h.Me)
}
