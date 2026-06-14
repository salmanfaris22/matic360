package attendance

import (
	"errors"
	"strconv"

	"github.com/gofiber/fiber/v2"
	"github.com/salman/distribution/internal/middleware"
	"github.com/salman/distribution/internal/shared/pagination"
	"github.com/salman/distribution/internal/shared/response"
	"github.com/salman/distribution/internal/shared/storage"
)

// Handler serves attendance endpoints (staff self-service + admin review).
type Handler struct {
	svc   *Service
	store storage.Storage
}

func NewHandler(svc *Service, store storage.Storage) *Handler {
	return &Handler{svc: svc, store: store}
}

// geoFromForm reads lat/lng/device + optional selfie file from a multipart body.
func (h *Handler) geoFromForm(c *fiber.Ctx) Geo {
	lat, _ := strconv.ParseFloat(c.FormValue("lat"), 64)
	lng, _ := strconv.ParseFloat(c.FormValue("lng"), 64)
	g := Geo{Lat: lat, Lng: lng, Device: c.FormValue("device")}
	if file, err := c.FormFile("selfie"); err == nil && file != nil {
		if url, err := h.store.Save(file, "attendance"); err == nil {
			g.Selfie = url
		}
	}
	return g
}

func mapErr(c *fiber.Ctx, err error) error {
	switch {
	case errors.Is(err, ErrNoStaffProfile):
		return response.Forbidden(c, err.Error())
	case errors.Is(err, ErrAlreadyIn), errors.Is(err, ErrNotCheckedIn),
		errors.Is(err, ErrAlreadyOut), errors.Is(err, ErrOnBreak), errors.Is(err, ErrNotOnBreak):
		return response.BadRequest(c, err.Error())
	default:
		return response.Internal(c, "attendance operation failed")
	}
}

func (h *Handler) CheckIn(c *fiber.Ctx) error {
	rec, err := h.svc.CheckIn(middleware.CurrentUserID(c), h.geoFromForm(c))
	if err != nil {
		return mapErr(c, err)
	}
	return response.Created(c, rec)
}

func (h *Handler) CheckOut(c *fiber.Ctx) error {
	rec, err := h.svc.CheckOut(middleware.CurrentUserID(c), h.geoFromForm(c))
	if err != nil {
		return mapErr(c, err)
	}
	return response.OK(c, rec)
}

func (h *Handler) BreakStart(c *fiber.Ctx) error {
	rec, err := h.svc.BreakStart(middleware.CurrentUserID(c))
	if err != nil {
		return mapErr(c, err)
	}
	return response.OK(c, rec)
}

func (h *Handler) BreakEnd(c *fiber.Ctx) error {
	rec, err := h.svc.BreakEnd(middleware.CurrentUserID(c))
	if err != nil {
		return mapErr(c, err)
	}
	return response.OK(c, rec)
}

// Today returns the staff member's profile + today's record.
func (h *Handler) Today(c *fiber.Ctx) error {
	st, rec, err := h.svc.Today(middleware.CurrentUserID(c))
	if err != nil {
		return mapErr(c, err)
	}
	return response.OK(c, fiber.Map{"staff": st, "attendance": rec})
}

// History returns the staff member's own attendance log.
func (h *Handler) History(c *fiber.Ctx) error {
	p := pagination.FromContext(c)
	items, total, err := h.svc.History(middleware.CurrentUserID(c), p)
	if err != nil {
		return mapErr(c, err)
	}
	return response.Paginated(c, items, p.BuildMeta(total))
}

// AdminList returns all attendance records for review.
func (h *Handler) AdminList(c *fiber.Ctx) error {
	p := pagination.FromContext(c)
	f := AdminFilters{
		Date:     c.Query("date"),
		BranchID: c.Query("branch_id"),
		StaffID:  c.Query("staff_id"),
		Status:   c.Query("status"),
	}
	items, total, err := h.svc.AdminList(p, f)
	if err != nil {
		return response.Internal(c, "failed to list attendance")
	}
	return response.Paginated(c, items, p.BuildMeta(total))
}

// Verify marks a record verified by the current admin.
func (h *Handler) Verify(c *fiber.Ctx) error {
	rec, err := h.svc.Verify(c.Params("id"), middleware.CurrentUserID(c), c.FormValue("notes"))
	if err != nil {
		return response.NotFound(c, "attendance record not found")
	}
	return response.OK(c, rec)
}
