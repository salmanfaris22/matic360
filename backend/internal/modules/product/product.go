package product

import (
	"github.com/gofiber/fiber/v2"
	"github.com/salman/distribution/internal/middleware"
	"github.com/salman/distribution/internal/models"
	"github.com/salman/distribution/internal/shared/crud"
	"gorm.io/gorm"
)

// RegisterRoutes mounts product master CRUD under the protected API group.
func RegisterRoutes(api fiber.Router, db *gorm.DB) {
	h := crud.New[models.Product](db, crud.Config{
		Search:  []string{"name", "sku", "category"},
		Filters: []string{"category", "branch_id"},
	})
	h.Register(api, "/products",
		middleware.RequirePermission("product.read"),
		middleware.RequireRole(models.RoleSuperAdmin, models.RoleAdmin),
	)
}
