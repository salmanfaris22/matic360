package newarrival

import (
	"github.com/gofiber/fiber/v2"
	"github.com/salman/distribution/internal/middleware"
	"github.com/salman/distribution/internal/models"
	"github.com/salman/distribution/internal/shared/crud"
	"gorm.io/gorm"
)

// RegisterRoutes mounts new-arrival CRUD under the protected API group.
func RegisterRoutes(api fiber.Router, db *gorm.DB) {
	h := crud.New[models.NewArrival](db, crud.Config{
		Search:  []string{"name", "description"},
		OrderBy: "launch_date desc",
	})
	h.Register(api, "/new-arrivals",
		middleware.RequirePermission("product.read"),
		middleware.RequireRole(models.RoleSuperAdmin, models.RoleAdmin),
	)
}
