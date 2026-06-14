package damage

import (
	"github.com/gofiber/fiber/v2"
	"github.com/salman/distribution/internal/middleware"
	"github.com/salman/distribution/internal/models"
	"github.com/salman/distribution/internal/shared/crud"
	"gorm.io/gorm"
)

// RegisterRoutes mounts damage-item CRUD. Staff may report (create) damages.
func RegisterRoutes(api fiber.Router, db *gorm.DB) {
	h := crud.New[models.DamageItem](db, crud.Config{
		Search:  []string{"product_name", "reason"},
		Preload: []string{"Branch"},
		Filters: []string{"branch_id"},
	})
	h.Register(api, "/damage-items",
		middleware.RequirePermission("damage.read"),
		middleware.RequireRole(models.RoleSuperAdmin, models.RoleAdmin, models.RoleStaff),
	)
}
