package user

import (
	"github.com/gofiber/fiber/v2"
	"github.com/salman/distribution/internal/middleware"
	"github.com/salman/distribution/internal/models"
	"github.com/salman/distribution/internal/shared/pagination"
	"github.com/salman/distribution/internal/shared/response"
	"github.com/salman/distribution/internal/shared/security"
	"github.com/salman/distribution/internal/shared/validation"
	"gorm.io/gorm"
)

type createRequest struct {
	Name     string `json:"name" validate:"required,min=2"`
	Email    string `json:"email" validate:"required,email"`
	Phone    string `json:"phone"`
	Password string `json:"password" validate:"required,min=6"`
	RoleID   uint   `json:"role_id" validate:"required"`
	BranchID *uint  `json:"branch_id"`
}

type updateRequest struct {
	Name     string `json:"name" validate:"required,min=2"`
	Phone    string `json:"phone"`
	RoleID   uint   `json:"role_id" validate:"required"`
	BranchID *uint  `json:"branch_id"`
	IsActive *bool  `json:"is_active"`
	Password string `json:"password"` // optional reset
}

// Handler serves user (account) management.
type Handler struct{ db *gorm.DB }

func NewHandler(db *gorm.DB) *Handler { return &Handler{db: db} }

func (h *Handler) list(c *fiber.Ctx) error {
	p := pagination.FromContext(c)
	q := h.db.Model(&models.User{}).Preload("Role").Preload("Branch")
	if p.Search != "" {
		like := "%" + p.Search + "%"
		q = q.Where("name ILIKE ? OR email ILIKE ?", like, like)
	}
	var total int64
	h.db.Model(&models.User{}).Count(&total)
	var items []models.User
	if err := p.Apply(q).Find(&items).Error; err != nil {
		return response.Internal(c, "failed to list users")
	}
	return response.Paginated(c, items, p.BuildMeta(total))
}

func (h *Handler) get(c *fiber.Ctx) error {
	var u models.User
	if err := h.db.Preload("Role").Preload("Branch").First(&u, c.Params("id")).Error; err != nil {
		return response.NotFound(c, "user not found")
	}
	return response.OK(c, u)
}

func (h *Handler) create(c *fiber.Ctx) error {
	var req createRequest
	if !validation.BindAndValidate(c, &req) {
		return nil
	}
	hash, err := security.HashPassword(req.Password)
	if err != nil {
		return response.Internal(c, "failed to hash password")
	}
	u := models.User{
		Name: req.Name, Email: req.Email, Phone: req.Phone,
		PasswordHash: hash, RoleID: req.RoleID, BranchID: req.BranchID,
		IsActive: true,
	}
	if err := h.db.Create(&u).Error; err != nil {
		return response.Conflict(c, "failed to create user (email may already exist)")
	}
	h.db.Preload("Role").Preload("Branch").First(&u, u.ID)
	return response.Created(c, u)
}

func (h *Handler) update(c *fiber.Ctx) error {
	var u models.User
	if err := h.db.First(&u, c.Params("id")).Error; err != nil {
		return response.NotFound(c, "user not found")
	}
	var req updateRequest
	if !validation.BindAndValidate(c, &req) {
		return nil
	}
	u.Name, u.Phone, u.RoleID, u.BranchID = req.Name, req.Phone, req.RoleID, req.BranchID
	if req.IsActive != nil {
		u.IsActive = *req.IsActive
	}
	if req.Password != "" {
		if hash, err := security.HashPassword(req.Password); err == nil {
			u.PasswordHash = hash
		}
	}
	if err := h.db.Save(&u).Error; err != nil {
		return response.Internal(c, "failed to update user")
	}
	h.db.Preload("Role").Preload("Branch").First(&u, u.ID)
	return response.OK(c, u)
}

func (h *Handler) delete(c *fiber.Ctx) error {
	if middleware.CurrentUserID(c) == parseID(c.Params("id")) {
		return response.BadRequest(c, "you cannot delete your own account")
	}
	if err := h.db.Delete(&models.User{}, c.Params("id")).Error; err != nil {
		return response.Internal(c, "failed to delete user")
	}
	return response.OKMessage(c, "user deleted", nil)
}

func parseID(s string) uint {
	var id uint
	for _, r := range s {
		if r < '0' || r > '9' {
			return 0
		}
		id = id*10 + uint(r-'0')
	}
	return id
}

// RegisterRoutes mounts user endpoints under the protected API group.
func RegisterRoutes(api fiber.Router, h *Handler) {
	g := api.Group("/users")
	g.Get("/", middleware.RequireRole(models.RoleSuperAdmin, models.RoleAdmin), h.list)
	g.Get("/:id", middleware.RequireRole(models.RoleSuperAdmin, models.RoleAdmin), h.get)
	g.Post("/", middleware.RequireRole(models.RoleSuperAdmin, models.RoleAdmin), h.create)
	g.Put("/:id", middleware.RequireRole(models.RoleSuperAdmin, models.RoleAdmin), h.update)
	g.Delete("/:id", middleware.RequireRole(models.RoleSuperAdmin), h.delete)
}
