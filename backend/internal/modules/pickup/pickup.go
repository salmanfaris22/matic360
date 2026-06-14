package pickup

import (
	"github.com/gofiber/fiber/v2"
	"github.com/salman/distribution/internal/middleware"
	"github.com/salman/distribution/internal/models"
	"github.com/salman/distribution/internal/shared/crud"
	"github.com/salman/distribution/internal/shared/response"
	"gorm.io/gorm"
)

// Handler adds a status transition on top of generic CRUD.
type Handler struct{ db *gorm.DB }

type statusRequest struct {
	Status models.PickupStatus `json:"status"`
}

func (h *Handler) updateStatus(c *fiber.Ctx) error {
	var p models.Pickup
	if err := h.db.First(&p, c.Params("id")).Error; err != nil {
		return response.NotFound(c, "pickup not found")
	}
	var req statusRequest
	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "invalid body")
	}
	switch req.Status {
	case models.PickupPending, models.PickupPicked, models.PickupDelivered:
		p.Status = req.Status
	default:
		return response.BadRequest(c, "status must be pending, picked or delivered")
	}
	if err := h.db.Save(&p).Error; err != nil {
		return response.Internal(c, "failed to update pickup")
	}
	return response.OK(c, p)
}

// RegisterRoutes mounts pickup CRUD + status update.
func RegisterRoutes(api fiber.Router, db *gorm.DB) {
	h := &Handler{db: db}
	cr := crud.New[models.Pickup](db, crud.Config{
		Search:  []string{"product_name", "notes"},
		Preload: []string{"Customer"},
		Filters: []string{"status", "customer_id", "assigned_to"},
	})
	cr.Register(api, "/pickups",
		middleware.RequirePermission("pickup.read"),
		middleware.RequireRole(models.RoleSuperAdmin, models.RoleAdmin),
	)
	// Staff assigned to a pickup may advance its status.
	api.Put("/pickups/:id/status", middleware.RequirePermission("pickup.update"), h.updateStatus)
}
