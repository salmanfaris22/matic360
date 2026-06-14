package staff

import (
	"github.com/gofiber/fiber/v2"
	"github.com/salman/distribution/internal/middleware"
	"github.com/salman/distribution/internal/models"
)

// RegisterRoutes mounts staff endpoints under the protected API group.
func RegisterRoutes(api fiber.Router, h *Handler) {
	g := api.Group("/staff")
	g.Get("/", middleware.RequirePermission("staff.read"), h.List)
	g.Get("/:id", middleware.RequirePermission("staff.read"), h.Get)
	g.Post("/", middleware.RequireRole(models.RoleSuperAdmin, models.RoleAdmin), h.Create)
	g.Put("/:id", middleware.RequireRole(models.RoleSuperAdmin, models.RoleAdmin), h.Update)
	g.Delete("/:id", middleware.RequireRole(models.RoleSuperAdmin, models.RoleAdmin), h.Delete)
	g.Post("/:id/upload", middleware.RequireRole(models.RoleSuperAdmin, models.RoleAdmin), h.Upload)
	g.Post("/:id/create-login", middleware.RequireRole(models.RoleSuperAdmin, models.RoleAdmin), h.CreateLogin)
}
