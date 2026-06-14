package salary

import (
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/salman/distribution/internal/middleware"
	"github.com/salman/distribution/internal/models"
	"github.com/salman/distribution/internal/shared/crud"
	"github.com/salman/distribution/internal/shared/response"
	"gorm.io/gorm"
)

// Handler adds salary status transitions on top of generic CRUD.
type Handler struct{ db *gorm.DB }

// setStatus transitions a salary record (approve / pay).
func (h *Handler) setStatus(status models.SalaryStatus) fiber.Handler {
	return func(c *fiber.Ctx) error {
		var s models.Salary
		if err := h.db.First(&s, c.Params("id")).Error; err != nil {
			return response.NotFound(c, "salary record not found")
		}
		s.Status = status
		uid := middleware.CurrentUserID(c)
		s.ApprovedBy = &uid
		if status == models.SalaryPaid {
			now := time.Now()
			s.PaidAt = &now
		}
		if err := h.db.Save(&s).Error; err != nil {
			return response.Internal(c, "failed to update salary")
		}
		return response.OK(c, s)
	}
}

type generateRequest struct {
	Month int `json:"month"`
	Year  int `json:"year"`
}

// generate creates pending ("due") salary records for every active staff member
// who doesn't yet have one for the given month/year, seeded from their base salary.
func (h *Handler) generate(c *fiber.Ctx) error {
	var req generateRequest
	_ = c.BodyParser(&req)
	now := time.Now()
	if req.Month == 0 {
		req.Month = int(now.Month())
	}
	if req.Year == 0 {
		req.Year = now.Year()
	}

	var staff []models.StaffProfile
	if err := h.db.Where("status = ?", models.StaffActive).Find(&staff).Error; err != nil {
		return response.Internal(c, "failed to load staff")
	}

	created := 0
	for _, st := range staff {
		var count int64
		h.db.Model(&models.Salary{}).
			Where("staff_id = ? AND month = ? AND year = ?", st.ID, req.Month, req.Year).
			Count(&count)
		if count > 0 {
			continue
		}
		sal := models.Salary{
			StaffID: st.ID,
			Month:   req.Month,
			Year:    req.Year,
			Basic:   st.Salary,
			Status:  models.SalaryPending,
		}
		if err := h.db.Create(&sal).Error; err == nil {
			created++
		}
	}
	return response.OK(c, fiber.Map{"created": created, "month": req.Month, "year": req.Year})
}

// me returns the calling staff member's own salary records.
func (h *Handler) me(c *fiber.Ctx) error {
	var staff models.StaffProfile
	if err := h.db.Where("user_id = ?", middleware.CurrentUserID(c)).First(&staff).Error; err != nil {
		return response.Forbidden(c, "no staff profile linked to this account")
	}
	var items []models.Salary
	h.db.Where("staff_id = ?", staff.ID).Order("year desc, month desc").Find(&items)
	return response.OK(c, items)
}

// RegisterRoutes mounts salary CRUD + status transitions.
func RegisterRoutes(api fiber.Router, db *gorm.DB) {
	h := &Handler{db: db}
	api.Get("/salaries/me", h.me) // staff self-service
	api.Post("/salaries/generate", middleware.RequireRole(models.RoleSuperAdmin, models.RoleAdmin), h.generate)

	cr := crud.New[models.Salary](db, crud.Config{
		Preload: []string{"Staff"},
		Filters: []string{"staff_id", "month", "year", "status"},
		OrderBy: "year desc, month desc",
	})
	cr.Register(api, "/salaries",
		middleware.RequirePermission("salary.read"),
		middleware.RequireRole(models.RoleSuperAdmin, models.RoleAdmin),
	)

	api.Put("/salaries/:id/approve", middleware.RequireRole(models.RoleSuperAdmin, models.RoleAdmin), h.setStatus(models.SalaryApproved))
	api.Put("/salaries/:id/pay", middleware.RequireRole(models.RoleSuperAdmin), h.setStatus(models.SalaryPaid))
}
