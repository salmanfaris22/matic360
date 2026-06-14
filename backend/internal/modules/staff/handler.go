package staff

import (
	"errors"
	"strconv"

	"github.com/gofiber/fiber/v2"
	"github.com/salman/distribution/internal/shared/pagination"
	"github.com/salman/distribution/internal/shared/response"
	"github.com/salman/distribution/internal/shared/storage"
	"github.com/salman/distribution/internal/shared/validation"
)

// Handler serves staff HTTP endpoints.
type Handler struct {
	svc   *Service
	store storage.Storage
}

func NewHandler(svc *Service, store storage.Storage) *Handler {
	return &Handler{svc: svc, store: store}
}

func (h *Handler) List(c *fiber.Ctx) error {
	p := pagination.FromContext(c)
	f := ListFilters{Status: c.Query("status")}
	if v := c.Query("branch_id"); v != "" {
		if id, err := strconv.ParseUint(v, 10, 64); err == nil {
			u := uint(id)
			f.BranchID = &u
		}
	}
	if v := c.Query("department_id"); v != "" {
		if id, err := strconv.ParseUint(v, 10, 64); err == nil {
			u := uint(id)
			f.DepartmentID = &u
		}
	}
	items, total, err := h.svc.List(p, f)
	if err != nil {
		return response.Internal(c, "failed to list staff")
	}
	return response.Paginated(c, items, p.BuildMeta(total))
}

func (h *Handler) Get(c *fiber.Ctx) error {
	st, err := h.svc.Get(c.Params("id"))
	if err != nil {
		return response.NotFound(c, "staff not found")
	}
	return response.OK(c, st)
}

func (h *Handler) Create(c *fiber.Ctx) error {
	var req CreateRequest
	if !validation.BindAndValidate(c, &req) {
		return nil
	}
	st, err := h.svc.Create(req)
	if err != nil {
		return response.Conflict(c, "failed to create staff (employee id may already exist)")
	}
	return response.Created(c, st)
}

func (h *Handler) Update(c *fiber.Ctx) error {
	var req UpdateRequest
	if !validation.BindAndValidate(c, &req) {
		return nil
	}
	st, err := h.svc.Update(c.Params("id"), req)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			return response.NotFound(c, "staff not found")
		}
		return response.Internal(c, "failed to update staff")
	}
	return response.OK(c, st)
}

func (h *Handler) Delete(c *fiber.Ctx) error {
	if err := h.svc.Delete(c.Params("id")); err != nil {
		if errors.Is(err, ErrNotFound) {
			return response.NotFound(c, "staff not found")
		}
		return response.Internal(c, "failed to delete staff")
	}
	return response.OKMessage(c, "staff deleted", nil)
}

type createLoginRequest struct {
	Email    string `json:"email" validate:"omitempty,email"`
	Password string `json:"password" validate:"required,min=6"`
}

// CreateLogin provisions a portal login for a staff member.
func (h *Handler) CreateLogin(c *fiber.Ctx) error {
	var req createLoginRequest
	if !validation.BindAndValidate(c, &req) {
		return nil
	}
	user, err := h.svc.CreateLogin(c.Params("id"), req.Email, req.Password)
	if err != nil {
		switch {
		case errors.Is(err, ErrNotFound):
			return response.NotFound(c, "staff not found")
		case errors.Is(err, ErrHasLogin):
			return response.Conflict(c, err.Error())
		case errors.Is(err, ErrNoEmail):
			return response.BadRequest(c, err.Error())
		default:
			return response.Conflict(c, "failed to create login (email may already be in use)")
		}
	}
	return response.Created(c, fiber.Map{
		"id":    user.ID,
		"email": user.Email,
		"name":  user.Name,
	})
}

// Upload accepts a multipart "file" and stores it as the staff member's
// photo / aadhaar / pan image (kind from ?type=).
func (h *Handler) Upload(c *fiber.Ctx) error {
	kind := c.Query("type", "photo")
	if kind != "photo" && kind != "aadhaar" && kind != "pan" {
		return response.BadRequest(c, "type must be one of: photo, aadhaar, pan")
	}
	file, err := c.FormFile("file")
	if err != nil {
		return response.BadRequest(c, "file is required (multipart field 'file')")
	}
	url, err := h.store.Save(file, "staff")
	if err != nil {
		return response.Internal(c, "failed to store file")
	}
	st, err := h.svc.SetImage(c.Params("id"), kind, url)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			return response.NotFound(c, "staff not found")
		}
		return response.Internal(c, "failed to attach image")
	}
	return response.OK(c, st)
}
