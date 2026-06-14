package attendance

import (
	"github.com/gofiber/fiber/v2"
	"github.com/salman/distribution/internal/middleware"
	"github.com/salman/distribution/internal/models"
)

// RegisterRoutes mounts attendance endpoints under the protected API group.
func RegisterRoutes(api fiber.Router, h *Handler) {
	// Staff self-service (any authenticated user with a staff profile).
	me := api.Group("/attendance/me")
	me.Get("/today", h.Today)
	me.Get("/history", h.History)
	me.Post("/check-in", h.CheckIn)
	me.Post("/check-out", h.CheckOut)
	me.Post("/break/start", h.BreakStart)
	me.Post("/break/end", h.BreakEnd)

	// Admin review.
	admin := api.Group("/attendance", middleware.RequirePermission("attendance.read"))
	admin.Get("/", h.AdminList)
	admin.Put("/:id/verify", middleware.RequireRole(models.RoleSuperAdmin, models.RoleAdmin), h.Verify)
}
