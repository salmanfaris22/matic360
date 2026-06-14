package department

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
	Name        string `json:"name" validate:"required,min=2"`
	Description string `json:"description"`
	IsActive    *bool  `json:"is_active"`
}

// Handler serves department CRUD.
type Handler struct{ db *gorm.DB }

func NewHandler(db *gorm.DB) *Handler { return &Handler{db: db} }

func (h *Handler) list(c *fiber.Ctx) error {
	p := pagination.FromContext(c)
	q := h.db.Model(&models.Department{})
	if p.Search != "" {
		q = q.Where("name ILIKE ?", "%"+p.Search+"%")
	}
	var total int64
	q.Count(&total)
	var items []models.Department
	if err := p.Apply(q).Find(&items).Error; err != nil {
		return response.Internal(c, "failed to list departments")
	}
	return response.Paginated(c, items, p.BuildMeta(total))
}

func (h *Handler) get(c *fiber.Ctx) error {
	var d models.Department
	if err := h.db.First(&d, c.Params("id")).Error; err != nil {
		return response.NotFound(c, "department not found")
	}
	return response.OK(c, d)
}

func (h *Handler) create(c *fiber.Ctx) error {
	var req upsertRequest
	if !validation.BindAndValidate(c, &req) {
		return nil
	}
	d := models.Department{Name: req.Name, Description: req.Description, IsActive: true}
	if req.IsActive != nil {
		d.IsActive = *req.IsActive
	}
	if err := h.db.Create(&d).Error; err != nil {
		return response.Internal(c, "failed to create department")
	}
	return response.Created(c, d)
}

func (h *Handler) update(c *fiber.Ctx) error {
	var d models.Department
	if err := h.db.First(&d, c.Params("id")).Error; err != nil {
		return response.NotFound(c, "department not found")
	}
	var req upsertRequest
	if !validation.BindAndValidate(c, &req) {
		return nil
	}
	d.Name = req.Name
	d.Description = req.Description
	if req.IsActive != nil {
		d.IsActive = *req.IsActive
	}
	if err := h.db.Save(&d).Error; err != nil {
		return response.Internal(c, "failed to update department")
	}
	return response.OK(c, d)
}

func (h *Handler) delete(c *fiber.Ctx) error {
	if err := h.db.Delete(&models.Department{}, c.Params("id")).Error; err != nil {
		return response.Internal(c, "failed to delete department")
	}
	return response.OKMessage(c, "department deleted", nil)
}

// RegisterRoutes mounts department endpoints under the protected API group.
func RegisterRoutes(api fiber.Router, h *Handler) {
	g := api.Group("/departments")
	g.Get("/", middleware.RequirePermission("department.read"), h.list)
	g.Get("/:id", middleware.RequirePermission("department.read"), h.get)
	g.Post("/", middleware.RequireRole(models.RoleSuperAdmin, models.RoleAdmin), h.create)
	g.Put("/:id", middleware.RequireRole(models.RoleSuperAdmin, models.RoleAdmin), h.update)
	g.Delete("/:id", middleware.RequireRole(models.RoleSuperAdmin), h.delete)
}
