package target

import (
	"errors"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/salman/distribution/internal/middleware"
	"github.com/salman/distribution/internal/models"
	"github.com/salman/distribution/internal/shared/response"
	"gorm.io/gorm"
)

// Handler serves staff collection targets (paid-based progress).
type Handler struct{ db *gorm.DB }

func NewHandler(db *gorm.DB) *Handler { return &Handler{db: db} }

// periodRange returns the [start, end] window for a period containing ref.
func periodRange(p models.TargetPeriod, ref time.Time) (time.Time, time.Time) {
	y, m, d := ref.Date()
	loc := ref.Location()
	monthStart := time.Date(y, m, 1, 0, 0, 0, 0, loc)
	switch p {
	case models.TargetWeekly:
		wd := int(ref.Weekday())
		if wd == 0 {
			wd = 7 // treat Sunday as last day; week starts Monday
		}
		start := time.Date(y, m, d, 0, 0, 0, 0, loc).AddDate(0, 0, -(wd - 1))
		return start, start.AddDate(0, 0, 7).Add(-time.Nanosecond)
	case models.TargetQuarterly:
		return monthStart, monthStart.AddDate(0, 3, 0).Add(-time.Nanosecond)
	case models.TargetHalfYearly:
		return monthStart, monthStart.AddDate(0, 6, 0).Add(-time.Nanosecond)
	case models.TargetYearly:
		start := time.Date(y, 1, 1, 0, 0, 0, 0, loc)
		return start, start.AddDate(1, 0, 0).Add(-time.Nanosecond)
	default: // monthly
		return monthStart, monthStart.AddDate(0, 1, 0).Add(-time.Nanosecond)
	}
}

// achieved sums the payments a staff member collected within [start, end].
func (h *Handler) achieved(staffID uint, start, end time.Time) float64 {
	var total float64
	h.db.Model(&models.Payment{}).
		Where("collected_by IN (SELECT user_id FROM staff_profiles WHERE id = ? AND user_id IS NOT NULL)", staffID).
		Where("status <> ?", models.PaymentRejected).
		Where("COALESCE(paid_at, created_at) BETWEEN ? AND ?", start, end).
		Select("COALESCE(SUM(amount),0)").Scan(&total)
	return total
}

// ensureCurrentMonthly auto-creates this month's monthly target from the
// staff member's default MonthlyTarget if it doesn't exist yet.
func (h *Handler) ensureCurrentMonthly(staff *models.StaffProfile) {
	if staff.MonthlyTarget <= 0 {
		return
	}
	start, end := periodRange(models.TargetMonthly, time.Now())
	var cnt int64
	h.db.Model(&models.StaffTarget{}).
		Where("staff_id = ? AND period = ? AND start_date = ?", staff.ID, models.TargetMonthly, start).
		Count(&cnt)
	if cnt == 0 {
		h.db.Create(&models.StaffTarget{
			StaffID: staff.ID, Period: models.TargetMonthly,
			StartDate: models.Date{Time: start}, EndDate: models.Date{Time: end},
			Amount: staff.MonthlyTarget, AutoGen: true,
		})
	}
}

type seriesPoint struct {
	Date   string  `json:"date"`
	Amount float64 `json:"amount"`
}

// dailySeries returns a per-day collected total (zero-filled) for [start, end],
// capped at today.
func (h *Handler) dailySeries(staffID uint, start, end time.Time) []seriesPoint {
	type row struct {
		Day    time.Time
		Amount float64
	}
	var rows []row
	h.db.Model(&models.Payment{}).
		Where("collected_by IN (SELECT user_id FROM staff_profiles WHERE id = ?)", staffID).
		Where("status <> ?", models.PaymentRejected).
		Where("COALESCE(paid_at, created_at) BETWEEN ? AND ?", start, end).
		Select("DATE(COALESCE(paid_at, created_at)) AS day, COALESCE(SUM(amount),0) AS amount").
		Group("day").Scan(&rows)

	byDay := make(map[string]float64, len(rows))
	for _, r := range rows {
		byDay[r.Day.Format("2006-01-02")] = r.Amount
	}
	out := []seriesPoint{}
	now := time.Now()
	for d := start; !d.After(end); d = d.AddDate(0, 0, 1) {
		if d.After(now) {
			break
		}
		key := d.Format("2006-01-02")
		out = append(out, seriesPoint{Date: key, Amount: byDay[key]})
	}
	return out
}

// withAchieved fills each target's Achieved field.
func (h *Handler) withAchieved(targets []models.StaffTarget) []models.StaffTarget {
	for i := range targets {
		targets[i].Achieved = h.achieved(targets[i].StaffID, targets[i].StartDate.Time, targets[i].EndDate.Time)
	}
	return targets
}

// ── Staff: my targets ────────────────────────────────────────────────
func (h *Handler) me(c *fiber.Ctx) error {
	var staff models.StaffProfile
	if err := h.db.Where("user_id = ?", middleware.CurrentUserID(c)).First(&staff).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return response.Forbidden(c, "no staff profile linked to this account")
		}
		return response.Internal(c, "failed to load profile")
	}
	h.ensureCurrentMonthly(&staff)

	mStart, mEnd := periodRange(models.TargetMonthly, time.Now())
	var targets []models.StaffTarget
	h.db.Where("staff_id = ? AND end_date >= ?", staff.ID, time.Now()).
		Order("end_date asc").Find(&targets)
	targets = h.withAchieved(targets)

	// Pick the current monthly target as the headline.
	var current *models.StaffTarget
	for i := range targets {
		if targets[i].Period == models.TargetMonthly && !targets[i].StartDate.Time.After(time.Now()) && !targets[i].EndDate.Time.Before(time.Now()) {
			current = &targets[i]
			break
		}
	}

	return response.OK(c, fiber.Map{
		"current": current,
		"targets": targets,
		"series":  h.dailySeries(staff.ID, mStart, mEnd),
		"month":   fiber.Map{"achieved": h.achieved(staff.ID, mStart, mEnd)},
	})
}

// ── Admin ────────────────────────────────────────────────────────────
type adminRow struct {
	StaffID       uint    `json:"staff_id"`
	Name          string  `json:"name"`
	EmployeeID    string  `json:"employee_id"`
	MonthlyTarget float64 `json:"monthly_target"`
	Achieved      float64 `json:"achieved"`
}

// adminList returns each active staff's monthly target + achieved-this-month.
func (h *Handler) adminList(c *fiber.Ctx) error {
	var staff []models.StaffProfile
	if err := h.db.Where("status = ?", models.StaffActive).Order("name asc").Find(&staff).Error; err != nil {
		return response.Internal(c, "failed to load staff")
	}
	mStart, mEnd := periodRange(models.TargetMonthly, time.Now())
	rows := make([]adminRow, 0, len(staff))
	for i := range staff {
		st := &staff[i]
		h.ensureCurrentMonthly(st)
		rows = append(rows, adminRow{
			StaffID: st.ID, Name: st.Name, EmployeeID: st.EmployeeID,
			MonthlyTarget: st.MonthlyTarget,
			Achieved:      h.achieved(st.ID, mStart, mEnd),
		})
	}
	return response.OK(c, rows)
}

// setDefault sets a staff member's default monthly target and refreshes the
// current month's auto target to match.
func (h *Handler) setDefault(c *fiber.Ctx) error {
	var in struct {
		StaffID uint    `json:"staff_id"`
		Amount  float64 `json:"amount"`
	}
	if err := c.BodyParser(&in); err != nil || in.StaffID == 0 {
		return response.BadRequest(c, "staff_id and amount are required")
	}
	var staff models.StaffProfile
	if err := h.db.First(&staff, in.StaffID).Error; err != nil {
		return response.NotFound(c, "staff not found")
	}
	staff.MonthlyTarget = in.Amount
	h.db.Model(&staff).Update("monthly_target", in.Amount)

	start, end := periodRange(models.TargetMonthly, time.Now())
	var t models.StaffTarget
	err := h.db.Where("staff_id = ? AND period = ? AND start_date = ?", staff.ID, models.TargetMonthly, start).First(&t).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		if in.Amount > 0 {
			h.db.Create(&models.StaffTarget{StaffID: staff.ID, Period: models.TargetMonthly,
				StartDate: models.Date{Time: start}, EndDate: models.Date{Time: end}, Amount: in.Amount, AutoGen: true})
		}
	} else {
		t.Amount = in.Amount
		h.db.Save(&t)
	}
	return response.OK(c, fiber.Map{"staff_id": staff.ID, "monthly_target": in.Amount})
}

// listForStaff returns all targets for a staff (admin), with achieved.
func (h *Handler) listForStaff(c *fiber.Ctx) error {
	var targets []models.StaffTarget
	q := h.db.Order("end_date desc")
	if v := c.Query("staff_id"); v != "" {
		q = q.Where("staff_id = ?", v)
	}
	if v := c.Query("period"); v != "" {
		q = q.Where("period = ?", v)
	}
	if err := q.Find(&targets).Error; err != nil {
		return response.Internal(c, "failed to list targets")
	}
	return response.OK(c, h.withAchieved(targets))
}

// create adds a specific-period target. end_date is derived from the period.
func (h *Handler) create(c *fiber.Ctx) error {
	var in struct {
		StaffID   uint                `json:"staff_id"`
		Period    models.TargetPeriod `json:"period"`
		Amount    float64             `json:"amount"`
		StartDate *models.Date        `json:"start_date"`
		Notes     string              `json:"notes"`
	}
	if err := c.BodyParser(&in); err != nil || in.StaffID == 0 || in.Amount <= 0 {
		return response.BadRequest(c, "staff_id, period and a positive amount are required")
	}
	if in.Period == "" {
		in.Period = models.TargetMonthly
	}
	ref := time.Now()
	if in.StartDate != nil && !in.StartDate.Time.IsZero() {
		ref = in.StartDate.Time
	}
	start, end := periodRange(in.Period, ref)
	t := models.StaffTarget{
		StaffID: in.StaffID, Period: in.Period, Amount: in.Amount, Notes: in.Notes,
		StartDate: models.Date{Time: start}, EndDate: models.Date{Time: end},
	}
	if err := h.db.Create(&t).Error; err != nil {
		return response.Internal(c, "failed to create target")
	}
	t.Achieved = h.achieved(t.StaffID, start, end)
	return response.Created(c, t)
}

func (h *Handler) update(c *fiber.Ctx) error {
	var t models.StaffTarget
	if err := h.db.First(&t, c.Params("id")).Error; err != nil {
		return response.NotFound(c, "target not found")
	}
	var in struct {
		Amount float64 `json:"amount"`
		Notes  string  `json:"notes"`
	}
	if err := c.BodyParser(&in); err != nil {
		return response.BadRequest(c, "invalid request body")
	}
	if in.Amount > 0 {
		t.Amount = in.Amount
	}
	t.Notes = in.Notes
	if err := h.db.Save(&t).Error; err != nil {
		return response.Internal(c, "failed to update target")
	}
	t.Achieved = h.achieved(t.StaffID, t.StartDate.Time, t.EndDate.Time)
	return response.OK(c, t)
}

func (h *Handler) delete(c *fiber.Ctx) error {
	if err := h.db.Delete(&models.StaffTarget{}, c.Params("id")).Error; err != nil {
		return response.Internal(c, "failed to delete target")
	}
	return response.OKMessage(c, "deleted", nil)
}

// RegisterRoutes mounts target endpoints.
func RegisterRoutes(api fiber.Router, db *gorm.DB) {
	h := NewHandler(db)
	g := api.Group("/targets")
	g.Get("/me", h.me) // any authenticated staff

	admin := g.Group("", middleware.RequireRole(models.RoleSuperAdmin, models.RoleAdmin))
	admin.Get("/admin", h.adminList)
	admin.Get("/", h.listForStaff)
	admin.Put("/default", h.setDefault)
	admin.Post("/", h.create)
	admin.Put("/:id", h.update)
	admin.Delete("/:id", h.delete)
}
