package customer

import (
	"github.com/gofiber/fiber/v2"
	"github.com/salman/distribution/internal/middleware"
	"github.com/salman/distribution/internal/models"
	"github.com/salman/distribution/internal/shared/crud"
	"gorm.io/gorm"
)

// RegisterRoutes mounts customer CRUD under the protected API group.
func RegisterRoutes(api fiber.Router, db *gorm.DB) {
	h := crud.New[models.Customer](db, crud.Config{
		Search:  []string{"name", "shop_name", "contact_person", "email", "phone", "district", "gst_number"},
		Preload: []string{"Branch"},
		Filters: []string{"branch_id", "district", "client_type"},
	})
	h.Register(api, "/customers",
		middleware.RequirePermission("customer.read"),
		middleware.RequireRole(models.RoleSuperAdmin, models.RoleAdmin),
	)
}
