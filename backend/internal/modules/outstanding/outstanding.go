package outstanding

import (
	"github.com/gofiber/fiber/v2"
	"github.com/salman/distribution/internal/middleware"
	"github.com/salman/distribution/internal/models"
	"github.com/salman/distribution/internal/shared/crud"
	"gorm.io/gorm"
)

// RegisterRoutes mounts outstanding (credit ledger) CRUD.
func RegisterRoutes(api fiber.Router, db *gorm.DB) {
	h := crud.New[models.Outstanding](db, crud.Config{
		Search:  []string{"description"},
		Preload: []string{"Customer"},
		Filters: []string{"customer_id", "status"},
		OrderBy: "due_date asc",
	})
	h.Register(api, "/outstandings",
		middleware.RequirePermission("outstanding.read"),
		middleware.RequireRole(models.RoleSuperAdmin, models.RoleAdmin),
	)
}
