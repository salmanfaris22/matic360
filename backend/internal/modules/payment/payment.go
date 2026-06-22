package payment

import (
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/salman/distribution/internal/middleware"
	"github.com/salman/distribution/internal/models"
	"github.com/salman/distribution/internal/modules/outstanding"
	"github.com/salman/distribution/internal/shared/pagination"
	"github.com/salman/distribution/internal/shared/response"
	"github.com/salman/distribution/internal/shared/storage"
	"gorm.io/gorm"
)

// Handler serves the admin collections view (payments are created against a
// bill via the outstanding module; here we list, image and verify them).
type Handler struct {
	db    *gorm.DB
	store storage.Storage
}

func NewHandler(db *gorm.DB, store storage.Storage) *Handler {
	return &Handler{db: db, store: store}
}

// list returns collections with customer/staff/date/status filters.
func (h *Handler) list(c *fiber.Ctx) error {
	pg := pagination.FromContext(c)
	q := h.db.Model(&models.Payment{}).
		Preload("Customer").
		Preload("Outstanding").
		Preload("Collector")

	if v := c.Query("status"); v != "" {
		q = q.Where("status = ?", v)
	}
	if v := c.Query("customer_id"); v != "" {
		q = q.Where("customer_id = ?", v)
	}
	if v := c.Query("staff_id"); v != "" {
		q = q.Where("collected_by IN (SELECT user_id FROM staff_profiles WHERE id = ? AND user_id IS NOT NULL)", v)
	}
	if v := c.Query("from"); v != "" {
		if d, err := time.ParseInLocation("2006-01-02", v, time.Local); err == nil {
			q = q.Where("created_at >= ?", d)
		}
	}
	if v := c.Query("to"); v != "" {
		if d, err := time.ParseInLocation("2006-01-02", v, time.Local); err == nil {
			q = q.Where("created_at < ?", d.Add(24*time.Hour))
		}
	}

	// Staff only see their own collections.
	if u := middleware.CurrentUser(c); u != nil && u.Role != nil && u.Role.Slug == models.RoleStaff {
		q = q.Where("collected_by = ?", u.ID)
	}

	var total int64
	q.Count(&total)
	var items []models.Payment
	if err := pg.Apply(q.Order("created_at desc")).Find(&items).Error; err != nil {
		return response.Internal(c, "failed to list payments")
	}
	return response.Paginated(c, items, pg.BuildMeta(total))
}

// reject marks a collection rejected and rolls its bill's balance back.
func (h *Handler) reject(c *fiber.Ctx) error {
	var p models.Payment
	if err := h.db.First(&p, c.Params("id")).Error; err != nil {
		return response.NotFound(c, "payment not found")
	}
	p.Status = models.PaymentRejected
	uid := middleware.CurrentUserID(c)
	p.ApprovedBy = &uid
	if err := h.db.Save(&p).Error; err != nil {
		return response.Internal(c, "failed to reject payment")
	}
	if p.OutstandingID != nil {
		_ = outstanding.RecomputeBill(h.db, *p.OutstandingID)
	}
	return response.OK(c, p)
}

// receipt uploads a receipt/cheque image for a collection.
func (h *Handler) receipt(c *fiber.Ctx) error {
	var p models.Payment
	if err := h.db.First(&p, c.Params("id")).Error; err != nil {
		return response.NotFound(c, "payment not found")
	}
	file, err := c.FormFile("file")
	if err != nil {
		return response.BadRequest(c, "file is required")
	}
	url, err := h.store.Save(file, "receipts")
	if err != nil {
		return response.Internal(c, "failed to store receipt")
	}
	p.ReceiptURL = url
	h.db.Save(&p)
	return response.OK(c, p)
}

// RegisterRoutes mounts payment endpoints under the protected API group.
func RegisterRoutes(api fiber.Router, db *gorm.DB, store storage.Storage) {
	h := NewHandler(db, store)
	g := api.Group("/payments")
	g.Get("/", h.list)
	g.Post("/:id/receipt", middleware.RequireRole(models.RoleSuperAdmin, models.RoleAdmin, models.RoleStaff), h.receipt)
	g.Put("/:id/reject", middleware.RequireRole(models.RoleSuperAdmin, models.RoleAdmin), h.reject)
}
