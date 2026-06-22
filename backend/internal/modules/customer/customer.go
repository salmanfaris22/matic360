package customer

import (
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/salman/distribution/internal/middleware"
	"github.com/salman/distribution/internal/models"
	"github.com/salman/distribution/internal/shared/crud"
	"github.com/salman/distribution/internal/shared/response"
	"gorm.io/gorm"
)

// RegisterRoutes mounts customer CRUD under the protected API group.
func RegisterRoutes(api fiber.Router, db *gorm.DB) {
	// Staff-accessible client lookup + quick-add, used by the outstanding form's
	// searchable picker. Mounted before the admin CRUD group so they win.
	api.Get("/customers/search", func(c *fiber.Ctx) error {
		var items []models.Customer
		q := db.Model(&models.Customer{}).Select("id", "name", "phone", "shop_name").
			Where("is_active = ?", true)
		if s := strings.TrimSpace(c.Query("q")); s != "" {
			like := "%" + s + "%"
			q = q.Where("name ILIKE ? OR phone ILIKE ? OR shop_name ILIKE ?", like, like, like)
		}
		if err := q.Order("name asc").Limit(20).Find(&items).Error; err != nil {
			return response.Internal(c, "failed to search clients")
		}
		return response.OK(c, items)
	})
	api.Post("/customers/quick", func(c *fiber.Ctx) error {
		var in struct {
			Name  string `json:"name"`
			Phone string `json:"phone"`
		}
		if err := c.BodyParser(&in); err != nil || strings.TrimSpace(in.Name) == "" {
			return response.BadRequest(c, "client name is required")
		}
		cust := models.Customer{Name: strings.TrimSpace(in.Name), Phone: strings.TrimSpace(in.Phone), IsActive: true}
		if err := db.Create(&cust).Error; err != nil {
			return response.Internal(c, "failed to create client")
		}
		return response.Created(c, cust)
	})

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
