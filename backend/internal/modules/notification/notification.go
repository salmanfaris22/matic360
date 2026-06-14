package notification

import (
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/salman/distribution/internal/middleware"
	"github.com/salman/distribution/internal/models"
	"github.com/salman/distribution/internal/shared/pagination"
	"github.com/salman/distribution/internal/shared/response"
	"gorm.io/gorm"
)

// Handler serves the per-user notification inbox.
type Handler struct{ db *gorm.DB }

func (h *Handler) list(c *fiber.Ctx) error {
	pg := pagination.FromContext(c)
	q := h.db.Model(&models.Notification{}).Where("user_id = ?", middleware.CurrentUserID(c))
	if c.Query("unread") == "true" {
		q = q.Where("is_read = ?", false)
	}
	var total int64
	q.Count(&total)
	var items []models.Notification
	if err := pg.Apply(q).Find(&items).Error; err != nil {
		return response.Internal(c, "failed to list notifications")
	}
	return response.Paginated(c, items, pg.BuildMeta(total))
}

func (h *Handler) unreadCount(c *fiber.Ctx) error {
	var n int64
	h.db.Model(&models.Notification{}).
		Where("user_id = ? AND is_read = ?", middleware.CurrentUserID(c), false).Count(&n)
	return response.OK(c, fiber.Map{"unread": n})
}

func (h *Handler) markRead(c *fiber.Ctx) error {
	now := time.Now()
	res := h.db.Model(&models.Notification{}).
		Where("id = ? AND user_id = ?", c.Params("id"), middleware.CurrentUserID(c)).
		Updates(map[string]any{"is_read": true, "read_at": now})
	if res.RowsAffected == 0 {
		return response.NotFound(c, "notification not found")
	}
	return response.OKMessage(c, "marked read", nil)
}

func (h *Handler) markAll(c *fiber.Ctx) error {
	now := time.Now()
	h.db.Model(&models.Notification{}).
		Where("user_id = ? AND is_read = ?", middleware.CurrentUserID(c), false).
		Updates(map[string]any{"is_read": true, "read_at": now})
	return response.OKMessage(c, "all marked read", nil)
}

type createRequest struct {
	UserID  uint   `json:"user_id"`
	Title   string `json:"title"`
	Message string `json:"message"`
	Type    string `json:"type"`
}

// create lets an admin push a notification to a user.
func (h *Handler) create(c *fiber.Ctx) error {
	var req createRequest
	if err := c.BodyParser(&req); err != nil || req.UserID == 0 {
		return response.BadRequest(c, "user_id, title and message are required")
	}
	n := models.Notification{UserID: req.UserID, Title: req.Title, Message: req.Message, Type: req.Type}
	if err := h.db.Create(&n).Error; err != nil {
		return response.Internal(c, "failed to create notification")
	}
	return response.Created(c, n)
}

// RegisterRoutes mounts notification endpoints under the protected API group.
func RegisterRoutes(api fiber.Router, db *gorm.DB) {
	h := &Handler{db: db}
	g := api.Group("/notifications")
	g.Get("/", h.list)
	g.Get("/unread-count", h.unreadCount)
	g.Put("/read-all", h.markAll)
	g.Put("/:id/read", h.markRead)
	g.Post("/", middleware.RequireRole(models.RoleSuperAdmin, models.RoleAdmin), h.create)
}
