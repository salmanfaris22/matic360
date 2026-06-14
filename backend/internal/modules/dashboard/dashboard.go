package dashboard

import (
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/salman/distribution/internal/models"
	"github.com/salman/distribution/internal/shared/response"
	"gorm.io/gorm"
)

// Handler serves aggregate dashboard metrics.
type Handler struct{ db *gorm.DB }

func NewHandler(db *gorm.DB) *Handler { return &Handler{db: db} }

// Summary returns headline counts for the dashboard cards.
func (h *Handler) Summary(c *fiber.Ctx) error {
	var (
		staffTotal     int64
		staffActive    int64
		customers      int64
		branches       int64
		departments    int64
		users          int64
		pendingPay     int64
		outstandingSum struct{ Total float64 }
	)

	h.db.Model(&models.StaffProfile{}).Count(&staffTotal)
	h.db.Model(&models.StaffProfile{}).Where("status = ?", models.StaffActive).Count(&staffActive)
	h.db.Model(&models.Customer{}).Count(&customers)
	h.db.Model(&models.Branch{}).Count(&branches)
	h.db.Model(&models.Department{}).Count(&departments)
	h.db.Model(&models.User{}).Count(&users)
	h.db.Model(&models.Payment{}).Where("status = ?", models.PaymentPending).Count(&pendingPay)
	h.db.Model(&models.Customer{}).Select("COALESCE(SUM(outstanding_amount),0) as total").Scan(&outstandingSum)

	return response.OK(c, fiber.Map{
		"staff_total":        staffTotal,
		"staff_active":       staffActive,
		"customers":          customers,
		"branches":           branches,
		"departments":        departments,
		"users":              users,
		"pending_payments":   pendingPay,
		"outstanding_amount": outstandingSum.Total,
	})
}

type pair struct {
	Label string  `json:"label"`
	Value float64 `json:"value"`
}

type monthPoint struct {
	Month string  `json:"month"`
	Total float64 `json:"total"`
}

// Charts returns aggregated datasets for the dashboard graphs.
func (h *Handler) Charts(c *fiber.Ctx) error {
	return response.OK(c, fiber.Map{
		"collections_trend":       h.collectionsTrend(),
		"attendance_today":        h.attendanceToday(),
		"payments_by_status":      h.paymentsByStatus(),
		"expenses_by_type":        h.expensesByType(),
		"outstanding_by_district": h.outstandingByDistrict(),
		"staff_by_department":     h.staffByDepartment(),
	})
}

// collectionsTrend: approved payment totals for the last 6 calendar months.
func (h *Handler) collectionsTrend() []monthPoint {
	type row struct {
		Ym    string
		Total float64
	}
	var rows []row
	from := time.Now().AddDate(0, -5, 0)
	from = time.Date(from.Year(), from.Month(), 1, 0, 0, 0, 0, time.Local)
	h.db.Model(&models.Payment{}).
		Select("to_char(COALESCE(paid_at, created_at), 'YYYY-MM') as ym, COALESCE(SUM(amount),0) as total").
		Where("status = ?", models.PaymentApproved).
		Where("COALESCE(paid_at, created_at) >= ?", from).
		Group("ym").Scan(&rows)

	byMonth := map[string]float64{}
	for _, r := range rows {
		byMonth[r.Ym] = r.Total
	}
	out := make([]monthPoint, 0, 6)
	for i := 5; i >= 0; i-- {
		m := time.Now().AddDate(0, -i, 0)
		key := m.Format("2006-01")
		out = append(out, monthPoint{Month: m.Format("Jan"), Total: byMonth[key]})
	}
	return out
}

func (h *Handler) attendanceToday() []pair {
	y, mo, d := time.Now().Date()
	day := time.Date(y, mo, d, 0, 0, 0, 0, time.Local)
	type row struct {
		Status string
		Count  int64
	}
	var rows []row
	h.db.Model(&models.Attendance{}).
		Select("status, count(*) as count").
		Where("date = ?", day).Group("status").Scan(&rows)

	counts := map[string]int64{}
	var marked int64
	for _, r := range rows {
		counts[r.Status] = r.Count
		marked += r.Count
	}
	var activeStaff int64
	h.db.Model(&models.StaffProfile{}).Where("status = ?", models.StaffActive).Count(&activeStaff)
	absent := activeStaff - marked
	if absent < 0 {
		absent = 0
	}
	return []pair{
		{Label: "Present", Value: float64(counts["present"])},
		{Label: "Late", Value: float64(counts["late"])},
		{Label: "Half day", Value: float64(counts["half_day"])},
		{Label: "Absent", Value: float64(absent)},
	}
}

func (h *Handler) paymentsByStatus() []pair {
	return h.groupCount(&models.Payment{}, "status")
}

func (h *Handler) staffByDepartment() []pair {
	type row struct {
		Name  string
		Count int64
	}
	var rows []row
	h.db.Table("staff_profiles").
		Select("COALESCE(departments.name, 'Unassigned') as name, count(*) as count").
		Joins("left join departments on departments.id = staff_profiles.department_id").
		Where("staff_profiles.deleted_at IS NULL").
		Group("departments.name").Scan(&rows)
	out := make([]pair, 0, len(rows))
	for _, r := range rows {
		out = append(out, pair{Label: r.Name, Value: float64(r.Count)})
	}
	return out
}

func (h *Handler) expensesByType() []pair {
	type row struct {
		ExpenseType string
		Total       float64
	}
	var rows []row
	h.db.Model(&models.Expense{}).
		Select("expense_type, COALESCE(SUM(amount),0) as total").
		Group("expense_type").Scan(&rows)
	out := make([]pair, 0, len(rows))
	for _, r := range rows {
		out = append(out, pair{Label: r.ExpenseType, Value: r.Total})
	}
	return out
}

func (h *Handler) outstandingByDistrict() []pair {
	type row struct {
		District string
		Total    float64
	}
	var rows []row
	h.db.Model(&models.Customer{}).
		Select("district, COALESCE(SUM(outstanding_amount),0) as total").
		Where("district <> '' AND outstanding_amount > 0").
		Group("district").Order("total desc").Limit(6).Scan(&rows)
	out := make([]pair, 0, len(rows))
	for _, r := range rows {
		out = append(out, pair{Label: r.District, Value: r.Total})
	}
	return out
}

// groupCount counts rows of a model grouped by a string column.
func (h *Handler) groupCount(model any, col string) []pair {
	type row struct {
		K string
		C int64
	}
	var rows []row
	h.db.Model(model).Select(col + " as k, count(*) as c").Group(col).Scan(&rows)
	out := make([]pair, 0, len(rows))
	for _, r := range rows {
		out = append(out, pair{Label: r.K, Value: float64(r.C)})
	}
	return out
}

// RegisterRoutes mounts dashboard endpoints under the protected API group.
func RegisterRoutes(api fiber.Router, h *Handler) {
	api.Get("/dashboard/summary", h.Summary)
	api.Get("/dashboard/charts", h.Charts)
}
