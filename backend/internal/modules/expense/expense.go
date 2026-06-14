package expense

import (
	"github.com/gofiber/fiber/v2"
	"github.com/salman/distribution/internal/middleware"
	"github.com/salman/distribution/internal/models"
	"github.com/salman/distribution/internal/shared/pagination"
	"github.com/salman/distribution/internal/shared/response"
	"github.com/salman/distribution/internal/shared/storage"
	"gorm.io/gorm"
)

// Handler serves expense logging + the Staff→Admin approval flow.
type Handler struct {
	db    *gorm.DB
	store storage.Storage
}

func NewHandler(db *gorm.DB, store storage.Storage) *Handler {
	return &Handler{db: db, store: store}
}

func (h *Handler) create(c *fiber.Ctx) error {
	var e models.Expense
	if err := c.BodyParser(&e); err != nil {
		return response.BadRequest(c, "invalid request body")
	}
	if e.Amount <= 0 {
		return response.BadRequest(c, "a positive amount is required")
	}
	e.UserID = middleware.CurrentUserID(c)
	e.Status = models.ExpensePending
	e.ApprovedBy = nil
	if err := h.db.Create(&e).Error; err != nil {
		return response.Internal(c, "failed to record expense")
	}
	return response.Created(c, e)
}

func (h *Handler) list(c *fiber.Ctx) error {
	pg := pagination.FromContext(c)
	q := h.db.Model(&models.Expense{}).Preload("User")
	if c.Query("status") != "" {
		q = q.Where("status = ?", c.Query("status"))
	}
	if u := middleware.CurrentUser(c); u != nil && u.Role != nil && u.Role.Slug == models.RoleStaff {
		q = q.Where("user_id = ?", u.ID)
	}
	var total int64
	q.Count(&total)
	var items []models.Expense
	if err := pg.Apply(q).Find(&items).Error; err != nil {
		return response.Internal(c, "failed to list expenses")
	}
	return response.Paginated(c, items, pg.BuildMeta(total))
}

func (h *Handler) setStatus(status models.ExpenseStatus) fiber.Handler {
	return func(c *fiber.Ctx) error {
		var e models.Expense
		if err := h.db.First(&e, c.Params("id")).Error; err != nil {
			return response.NotFound(c, "expense not found")
		}
		e.Status = status
		uid := middleware.CurrentUserID(c)
		e.ApprovedBy = &uid
		if err := h.db.Save(&e).Error; err != nil {
			return response.Internal(c, "failed to update expense")
		}
		return response.OK(c, e)
	}
}

func (h *Handler) bill(c *fiber.Ctx) error {
	var e models.Expense
	if err := h.db.First(&e, c.Params("id")).Error; err != nil {
		return response.NotFound(c, "expense not found")
	}
	file, err := c.FormFile("file")
	if err != nil {
		return response.BadRequest(c, "file is required")
	}
	url, err := h.store.Save(file, "expenses")
	if err != nil {
		return response.Internal(c, "failed to store bill")
	}
	e.BillURL = url
	h.db.Save(&e)
	return response.OK(c, e)
}

// RegisterRoutes mounts expense endpoints under the protected API group.
func RegisterRoutes(api fiber.Router, db *gorm.DB, store storage.Storage) {
	h := NewHandler(db, store)
	g := api.Group("/expenses")
	g.Get("/", h.list)
	g.Post("/", middleware.RequireRole(models.RoleSuperAdmin, models.RoleAdmin, models.RoleStaff), h.create)
	g.Post("/:id/bill", middleware.RequireRole(models.RoleSuperAdmin, models.RoleAdmin, models.RoleStaff), h.bill)
	g.Put("/:id/approve", middleware.RequireRole(models.RoleSuperAdmin, models.RoleAdmin), h.setStatus(models.ExpenseApproved))
	g.Put("/:id/reject", middleware.RequireRole(models.RoleSuperAdmin, models.RoleAdmin), h.setStatus(models.ExpenseRejected))
}
