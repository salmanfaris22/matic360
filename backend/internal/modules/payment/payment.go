package payment

import (
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/salman/distribution/internal/middleware"
	"github.com/salman/distribution/internal/models"
	"github.com/salman/distribution/internal/shared/pagination"
	"github.com/salman/distribution/internal/shared/response"
	"github.com/salman/distribution/internal/shared/storage"
	"gorm.io/gorm"
)

// Handler serves payment collection + the Staff→Admin→Super Admin approval flow.
type Handler struct {
	db    *gorm.DB
	store storage.Storage
}

func NewHandler(db *gorm.DB, store storage.Storage) *Handler {
	return &Handler{db: db, store: store}
}

// Create records a collection (status starts pending; collected_by = caller).
func (h *Handler) create(c *fiber.Ctx) error {
	var p models.Payment
	if err := c.BodyParser(&p); err != nil {
		return response.BadRequest(c, "invalid request body")
	}
	if p.Amount <= 0 || p.CustomerID == 0 {
		return response.BadRequest(c, "customer_id and a positive amount are required")
	}
	p.CollectedBy = middleware.CurrentUserID(c)
	p.Status = models.PaymentPending
	p.ApprovedBy = nil
	if err := h.db.Create(&p).Error; err != nil {
		return response.Internal(c, "failed to record payment")
	}
	return response.Created(c, p)
}

func (h *Handler) list(c *fiber.Ctx) error {
	pg := pagination.FromContext(c)
	q := h.db.Model(&models.Payment{}).Preload("Customer")
	if c.Query("status") != "" {
		q = q.Where("status = ?", c.Query("status"))
	}
	// Staff only see their own collections.
	if u := middleware.CurrentUser(c); u != nil && u.Role != nil && u.Role.Slug == models.RoleStaff {
		q = q.Where("collected_by = ?", u.ID)
	}
	var total int64
	q.Count(&total)
	var items []models.Payment
	if err := pg.Apply(q).Find(&items).Error; err != nil {
		return response.Internal(c, "failed to list payments")
	}
	return response.Paginated(c, items, pg.BuildMeta(total))
}

// approve advances status: admin → admin_approved, super_admin → approved.
func (h *Handler) approve(c *fiber.Ctx) error {
	var p models.Payment
	if err := h.db.First(&p, c.Params("id")).Error; err != nil {
		return response.NotFound(c, "payment not found")
	}
	u := middleware.CurrentUser(c)
	now := time.Now()
	if u.Role != nil && u.Role.Slug == models.RoleSuperAdmin {
		p.Status = models.PaymentApproved
		p.PaidAt = &now
	} else {
		p.Status = models.PaymentAdminApproved
	}
	uid := u.ID
	p.ApprovedBy = &uid
	if err := h.db.Save(&p).Error; err != nil {
		return response.Internal(c, "failed to approve payment")
	}
	return response.OK(c, p)
}

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
	return response.OK(c, p)
}

// receipt uploads a receipt image for a payment.
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
	g.Post("/", middleware.RequireRole(models.RoleSuperAdmin, models.RoleAdmin, models.RoleStaff), h.create)
	g.Post("/:id/receipt", middleware.RequireRole(models.RoleSuperAdmin, models.RoleAdmin, models.RoleStaff), h.receipt)
	g.Put("/:id/approve", middleware.RequireRole(models.RoleSuperAdmin, models.RoleAdmin), h.approve)
	g.Put("/:id/reject", middleware.RequireRole(models.RoleSuperAdmin, models.RoleAdmin), h.reject)
}
