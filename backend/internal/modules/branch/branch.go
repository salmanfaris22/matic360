package branch

import (
	"github.com/gofiber/fiber/v2"
	"github.com/salman/distribution/internal/middleware"
	"github.com/salman/distribution/internal/models"
	"github.com/salman/distribution/internal/shared/pagination"
	"github.com/salman/distribution/internal/shared/response"
	"github.com/salman/distribution/internal/shared/validation"
	"gorm.io/gorm"
)

type upsertRequest struct {
	Name      string `json:"name" validate:"required,min=2"`
	Code      string `json:"code"`
	Address   string `json:"address"`
	District  string `json:"district"`
	Phone     string `json:"phone"`
	ManagerID *uint  `json:"manager_id"`
	IsActive  *bool  `json:"is_active"`
}

// Handler serves branch CRUD.
type Handler struct{ db *gorm.DB }

func NewHandler(db *gorm.DB) *Handler { return &Handler{db: db} }

func (h *Handler) list(c *fiber.Ctx) error {
	p := pagination.FromContext(c)
	q := h.db.Model(&models.Branch{})
	if p.Search != "" {
		like := "%" + p.Search + "%"
		q = q.Where("name ILIKE ? OR code ILIKE ? OR district ILIKE ?", like, like, like)
	}
	var total int64
	q.Count(&total)
	var items []models.Branch
	if err := p.Apply(q).Find(&items).Error; err != nil {
		return response.Internal(c, "failed to list branches")
	}
	return response.Paginated(c, items, p.BuildMeta(total))
}

func (h *Handler) get(c *fiber.Ctx) error {
	var b models.Branch
	if err := h.db.First(&b, c.Params("id")).Error; err != nil {
		return response.NotFound(c, "branch not found")
	}
	return response.OK(c, b)
}

func (h *Handler) create(c *fiber.Ctx) error {
	var req upsertRequest
	if !validation.BindAndValidate(c, &req) {
		return nil
	}
	b := models.Branch{
		Name: req.Name, Code: req.Code, Address: req.Address,
		District: req.District, Phone: req.Phone, ManagerID: req.ManagerID,
		IsActive: true,
	}
	if req.IsActive != nil {
		b.IsActive = *req.IsActive
	}
	if err := h.db.Create(&b).Error; err != nil {
		return response.Conflict(c, "failed to create branch (code may already exist)")
	}
	return response.Created(c, b)
}

func (h *Handler) update(c *fiber.Ctx) error {
	var b models.Branch
	if err := h.db.First(&b, c.Params("id")).Error; err != nil {
		return response.NotFound(c, "branch not found")
	}
	var req upsertRequest
	if !validation.BindAndValidate(c, &req) {
		return nil
	}
	b.Name, b.Code, b.Address = req.Name, req.Code, req.Address
	b.District, b.Phone, b.ManagerID = req.District, req.Phone, req.ManagerID
	if req.IsActive != nil {
		b.IsActive = *req.IsActive
	}
	if err := h.db.Save(&b).Error; err != nil {
		return response.Internal(c, "failed to update branch")
	}
	return response.OK(c, b)
}

func (h *Handler) delete(c *fiber.Ctx) error {
	var b models.Branch
	if err := h.db.First(&b, c.Params("id")).Error; err != nil {
		return response.NotFound(c, "branch not found")
	}
	if b.IsHeadOffice {
		return response.BadRequest(c, "cannot delete the head office")
	}
	if err := h.db.Delete(&models.Branch{}, b.ID).Error; err != nil {
		return response.Internal(c, "failed to delete branch")
	}
	return response.OKMessage(c, "branch deleted", nil)
}

// RegisterRoutes mounts branch endpoints under the protected API group.
func RegisterRoutes(api fiber.Router, h *Handler) {
	g := api.Group("/branches")
	g.Get("/", middleware.RequirePermission("branch.read"), h.list)
	g.Get("/:id", middleware.RequirePermission("branch.read"), h.get)
	g.Post("/", middleware.RequireRole(models.RoleSuperAdmin), h.create)
	g.Put("/:id", middleware.RequireRole(models.RoleSuperAdmin), h.update)
	g.Delete("/:id", middleware.RequireRole(models.RoleSuperAdmin), h.delete)
}
