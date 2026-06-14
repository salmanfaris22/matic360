package role

import (
	"encoding/json"

	"github.com/gofiber/fiber/v2"
	"github.com/salman/distribution/internal/middleware"
	"github.com/salman/distribution/internal/models"
	"github.com/salman/distribution/internal/shared/response"
	"github.com/salman/distribution/internal/shared/validation"
	"gorm.io/datatypes"
	"gorm.io/gorm"
)

type upsertRequest struct {
	Name        string   `json:"name" validate:"required,min=2"`
	Slug        string   `json:"slug" validate:"required,min=2"`
	Description string   `json:"description"`
	Permissions []string `json:"permissions"`
}

// Handler serves role CRUD. Roles are sensitive — writes are super-admin only.
type Handler struct{ db *gorm.DB }

func NewHandler(db *gorm.DB) *Handler { return &Handler{db: db} }

func (h *Handler) list(c *fiber.Ctx) error {
	var roles []models.Role
	if err := h.db.Order("id asc").Find(&roles).Error; err != nil {
		return response.Internal(c, "failed to list roles")
	}
	return response.OK(c, roles)
}

func (h *Handler) get(c *fiber.Ctx) error {
	var r models.Role
	if err := h.db.First(&r, c.Params("id")).Error; err != nil {
		return response.NotFound(c, "role not found")
	}
	return response.OK(c, r)
}

func (h *Handler) create(c *fiber.Ctx) error {
	var req upsertRequest
	if !validation.BindAndValidate(c, &req) {
		return nil
	}
	permJSON, _ := json.Marshal(req.Permissions)
	r := models.Role{
		Name: req.Name, Slug: req.Slug, Description: req.Description,
		Permissions: datatypes.JSON(permJSON),
	}
	if err := h.db.Create(&r).Error; err != nil {
		return response.Conflict(c, "failed to create role (slug may already exist)")
	}
	return response.Created(c, r)
}

func (h *Handler) update(c *fiber.Ctx) error {
	var r models.Role
	if err := h.db.First(&r, c.Params("id")).Error; err != nil {
		return response.NotFound(c, "role not found")
	}
	if r.IsSystem {
		return response.BadRequest(c, "system roles cannot be modified")
	}
	var req upsertRequest
	if !validation.BindAndValidate(c, &req) {
		return nil
	}
	permJSON, _ := json.Marshal(req.Permissions)
	r.Name, r.Slug, r.Description = req.Name, req.Slug, req.Description
	r.Permissions = datatypes.JSON(permJSON)
	if err := h.db.Save(&r).Error; err != nil {
		return response.Internal(c, "failed to update role")
	}
	return response.OK(c, r)
}

func (h *Handler) delete(c *fiber.Ctx) error {
	var r models.Role
	if err := h.db.First(&r, c.Params("id")).Error; err != nil {
		return response.NotFound(c, "role not found")
	}
	if r.IsSystem {
		return response.BadRequest(c, "system roles cannot be deleted")
	}
	if err := h.db.Delete(&models.Role{}, r.ID).Error; err != nil {
		return response.Internal(c, "failed to delete role")
	}
	return response.OKMessage(c, "role deleted", nil)
}

// RegisterRoutes mounts role endpoints under the protected API group.
func RegisterRoutes(api fiber.Router, h *Handler) {
	g := api.Group("/roles")
	g.Get("/", middleware.RequirePermission("role.read"), h.list)
	g.Get("/:id", middleware.RequirePermission("role.read"), h.get)
	g.Post("/", middleware.RequireRole(models.RoleSuperAdmin), h.create)
	g.Put("/:id", middleware.RequireRole(models.RoleSuperAdmin), h.update)
	g.Delete("/:id", middleware.RequireRole(models.RoleSuperAdmin), h.delete)
}
