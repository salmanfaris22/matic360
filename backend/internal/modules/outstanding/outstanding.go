package outstanding

import (
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/salman/distribution/internal/middleware"
	"github.com/salman/distribution/internal/models"
	"github.com/salman/distribution/internal/shared/pagination"
	"github.com/salman/distribution/internal/shared/response"
	"github.com/salman/distribution/internal/shared/storage"
	"gorm.io/gorm"
)

// Handler manages customer bills (Outstanding) and the payments staff add
// against them over time.
type Handler struct {
	db    *gorm.DB
	store storage.Storage
}

func NewHandler(db *gorm.DB, store storage.Storage) *Handler {
	return &Handler{db: db, store: store}
}

// RecomputeBill re-derives a bill's PaidAmount, DueDate and Status from its
// payments. Exported so the payment module can reuse it after approve/reject.
func RecomputeBill(db *gorm.DB, billID uint) error {
	var o models.Outstanding
	if err := db.Preload("Payments").First(&o, billID).Error; err != nil {
		return err
	}
	var paid float64
	var nextDue *models.Date
	for i := range o.Payments {
		p := o.Payments[i]
		if p.Status == models.PaymentRejected {
			continue // rejected collections don't count toward the balance
		}
		paid += p.Amount
		if p.NextPaymentDate != nil && !p.NextPaymentDate.Time.IsZero() {
			nextDue = p.NextPaymentDate // last non-empty wins (payments load oldest→newest)
		}
	}
	o.PaidAmount = paid
	if nextDue != nil {
		o.DueDate = nextDue
	}
	switch {
	case o.Amount > 0 && paid >= o.Amount:
		o.Status = models.OutClosed
	case paid > 0:
		o.Status = models.OutPartial
	default:
		o.Status = models.OutOpen
	}
	return db.Save(&o).Error
}

// scopeToStaff restricts the query to the caller's own bills when they are staff.
func scopeToStaff(c *fiber.Ctx, q *gorm.DB) *gorm.DB {
	if u := middleware.CurrentUser(c); u != nil && u.Role != nil && u.Role.Slug == models.RoleStaff {
		return q.Where("created_by = ?", u.ID)
	}
	return q
}

// list returns bills with search + filters (customer, staff, status, date, colour).
func (h *Handler) list(c *fiber.Ctx) error {
	pg := pagination.FromContext(c)
	q := scopeToStaff(c, h.db.Model(&models.Outstanding{}).Preload("Customer").Preload("Assignees"))

	if v := c.Query("search"); v != "" {
		like := "%" + v + "%"
		q = q.Where("ref_code ILIKE ? OR bill_number ILIKE ? OR item_name ILIKE ? OR description ILIKE ? OR customer_id IN (SELECT id FROM customers WHERE name ILIKE ?)", like, like, like, like, like)
	}
	if v := c.Query("customer_id"); v != "" {
		q = q.Where("customer_id = ?", v)
	}
	if v := c.Query("created_by"); v != "" {
		q = q.Where("created_by = ?", v)
	}
	// staff_id → resolve to the staff member's login account (raiser of the bill).
	if v := c.Query("staff_id"); v != "" {
		q = q.Where("created_by IN (SELECT user_id FROM staff_profiles WHERE id = ? AND user_id IS NOT NULL)", v)
	}
	switch c.Query("status") {
	case "pending":
		q = q.Where("status <> ?", models.OutClosed)
	case "complete":
		q = q.Where("status = ?", models.OutClosed)
	case "open", "partial", "closed":
		q = q.Where("status = ?", c.Query("status"))
	}
	if v := c.Query("from"); v != "" {
		if d, err := time.ParseInLocation("2006-01-02", v, time.Local); err == nil {
			q = q.Where("bill_date >= ?", d)
		}
	}
	if v := c.Query("to"); v != "" {
		if d, err := time.ParseInLocation("2006-01-02", v, time.Local); err == nil {
			q = q.Where("bill_date < ?", d.Add(24*time.Hour))
		}
	}
	// Aging anchors on the next-due date, else the bill date — so an old unpaid
	// bill ages from when it was raised even if no next date was set.
	now := time.Now()
	switch c.Query("color") {
	case "green":
		q = q.Where("COALESCE(due_date, bill_date) >= ?", now.AddDate(0, 0, -45))
	case "orange", "yellow":
		q = q.Where("COALESCE(due_date, bill_date) < ? AND COALESCE(due_date, bill_date) >= ?", now.AddDate(0, 0, -45), now.AddDate(0, 0, -90))
	case "red":
		q = q.Where("COALESCE(due_date, bill_date) < ?", now.AddDate(0, 0, -90))
	}

	var total int64
	q.Count(&total)
	var items []models.Outstanding
	if err := pg.Apply(q.Order("bill_date desc, id desc")).Find(&items).Error; err != nil {
		return response.Internal(c, "failed to list bills")
	}
	return response.Paginated(c, items, pg.BuildMeta(total))
}

// get returns one bill with its full payment history.
func (h *Handler) get(c *fiber.Ctx) error {
	var o models.Outstanding
	q := scopeToStaff(c, h.db.Preload("Customer").Preload("Creator").Preload("Assignees").
		Preload("Payments", func(db *gorm.DB) *gorm.DB { return db.Order("created_at asc") }).
		Preload("Payments.Collector"))
	if err := q.First(&o, c.Params("id")).Error; err != nil {
		return response.NotFound(c, "bill not found")
	}
	return response.OK(c, o)
}

// create raises a new bill. Bill date defaults to today; created_by = caller.
func (h *Handler) create(c *fiber.Ctx) error {
	var o models.Outstanding
	if err := c.BodyParser(&o); err != nil {
		return response.BadRequest(c, "invalid request body")
	}
	if o.CustomerID == 0 || o.Amount <= 0 {
		return response.BadRequest(c, "customer_id and a positive amount are required")
	}
	if o.BillDate == nil || o.BillDate.Time.IsZero() {
		o.BillDate = &models.Date{Time: time.Now()}
	}
	o.CreatedBy = middleware.CurrentUserID(c)
	o.PaidAmount = 0
	o.Status = models.OutOpen
	o.Payments = nil
	if err := h.db.Create(&o).Error; err != nil {
		return response.Internal(c, "failed to create bill")
	}
	// Auto reference code (e.g. OUT255T) once the id is known, for tracking.
	o.RefCode = "OUT" + strings.ToUpper(strconv.FormatInt(int64(o.ID)+100000, 36))
	h.db.Model(&o).Update("ref_code", o.RefCode)
	h.db.Preload("Customer").First(&o, o.ID)
	return response.Created(c, o)
}

// update edits a bill (only while it is not fully paid; staff scoped to own).
func (h *Handler) update(c *fiber.Ctx) error {
	var o models.Outstanding
	if err := scopeToStaff(c, h.db).First(&o, c.Params("id")).Error; err != nil {
		return response.NotFound(c, "bill not found")
	}
	var in struct {
		CustomerID  uint         `json:"customer_id"`
		BillNumber  string       `json:"bill_number"`
		ItemName    string       `json:"item_name"`
		BillDate    *models.Date `json:"bill_date"`
		Amount      float64      `json:"amount"`
		Description string       `json:"description"`
	}
	if err := c.BodyParser(&in); err != nil {
		return response.BadRequest(c, "invalid request body")
	}
	if in.CustomerID != 0 {
		o.CustomerID = in.CustomerID
	}
	o.BillNumber = in.BillNumber
	o.ItemName = in.ItemName
	o.Description = in.Description
	if in.BillDate != nil && !in.BillDate.Time.IsZero() {
		o.BillDate = in.BillDate
	}
	if in.Amount > 0 {
		o.Amount = in.Amount
	}
	if err := h.db.Save(&o).Error; err != nil {
		return response.Internal(c, "failed to update bill")
	}
	_ = RecomputeBill(h.db, o.ID)
	h.db.Preload("Customer").First(&o, o.ID)
	return response.OK(c, o)
}

// addPayment records a collection against the bill and rolls up the balance.
func (h *Handler) addPayment(c *fiber.Ctx) error {
	var o models.Outstanding
	if err := scopeToStaff(c, h.db).First(&o, c.Params("id")).Error; err != nil {
		return response.NotFound(c, "bill not found")
	}
	var p models.Payment
	if err := c.BodyParser(&p); err != nil {
		return response.BadRequest(c, "invalid request body")
	}
	if p.Amount <= 0 {
		return response.BadRequest(c, "a positive amount is required")
	}
	if p.PaymentType == models.PayCheque && p.ChequeNumber == "" {
		return response.BadRequest(c, "cheque_number is required for cheque payments")
	}
	oid := o.ID
	p.OutstandingID = &oid
	p.CustomerID = o.CustomerID
	p.CollectedBy = middleware.CurrentUserID(c)
	p.Status = models.PaymentApproved // collections apply immediately
	now := time.Now()
	p.PaidAt = &now
	if err := h.db.Create(&p).Error; err != nil {
		return response.Internal(c, "failed to record payment")
	}
	if err := RecomputeBill(h.db, o.ID); err != nil {
		return response.Internal(c, "failed to update bill")
	}
	// Return the refreshed bill with history.
	h.db.Preload("Customer").
		Preload("Payments", func(db *gorm.DB) *gorm.DB { return db.Order("created_at asc") }).
		Preload("Payments.Collector").First(&o, o.ID)
	return response.OK(c, o)
}

// billImage uploads the bill photo.
func (h *Handler) billImage(c *fiber.Ctx) error {
	var o models.Outstanding
	if err := scopeToStaff(c, h.db).First(&o, c.Params("id")).Error; err != nil {
		return response.NotFound(c, "bill not found")
	}
	file, err := c.FormFile("file")
	if err != nil {
		return response.BadRequest(c, "file is required")
	}
	url, err := h.store.Save(file, "bills")
	if err != nil {
		return response.Internal(c, "failed to store image")
	}
	o.ImageURL = url
	h.db.Save(&o)
	return response.OK(c, o)
}

// byClient aggregates open bills per customer for the client-based admin view.
func (h *Handler) byClient(c *fiber.Ctx) error {
	type row struct {
		CustomerID   uint       `json:"customer_id"`
		CustomerName string     `json:"customer_name"`
		Phone        string     `json:"phone"`
		BillCount    int        `json:"bill_count"`
		TotalDue     float64    `json:"total_due"`
		OldestDue    *time.Time `json:"oldest_due"`
	}
	var rows []row
	q := h.db.Model(&models.Outstanding{}).
		Select(`outstandings.customer_id,
			customers.name AS customer_name,
			customers.phone AS phone,
			COUNT(*) AS bill_count,
			COALESCE(SUM(outstandings.amount - outstandings.paid_amount), 0) AS total_due,
			MIN(COALESCE(outstandings.due_date, outstandings.bill_date)) AS oldest_due`).
		Joins("JOIN customers ON customers.id = outstandings.customer_id").
		Where("outstandings.deleted_at IS NULL AND outstandings.status <> ?", models.OutClosed).
		Group("outstandings.customer_id, customers.name, customers.phone").
		Order("total_due desc")
	if v := c.Query("search"); v != "" {
		q = q.Where("customers.name ILIKE ? OR customers.phone ILIKE ?", "%"+v+"%", "%"+v+"%")
	}
	if v := c.Query("staff_id"); v != "" {
		q = q.Where("outstandings.created_by IN (SELECT user_id FROM staff_profiles WHERE id = ? AND user_id IS NOT NULL)", v)
	}
	if v := c.Query("from"); v != "" {
		if d, err := time.ParseInLocation("2006-01-02", v, time.Local); err == nil {
			q = q.Where("outstandings.bill_date >= ?", d)
		}
	}
	if v := c.Query("to"); v != "" {
		if d, err := time.ParseInLocation("2006-01-02", v, time.Local); err == nil {
			q = q.Where("outstandings.bill_date < ?", d.Add(24*time.Hour))
		}
	}
	if err := q.Scan(&rows).Error; err != nil {
		return response.Internal(c, "failed to aggregate clients")
	}
	return response.OK(c, rows)
}

// stats returns billed vs collected totals for the last 6 months, for the
// chart at the top of the admin Outstanding page.
func (h *Handler) stats(c *fiber.Ctx) error {
	type monthStat struct {
		Month     string  `json:"month"`
		Billed    float64 `json:"billed"`
		Collected float64 `json:"collected"`
	}
	now := time.Now()
	curStart := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, time.Local)
	out := make([]monthStat, 0, 6)
	for i := 5; i >= 0; i-- {
		start := curStart.AddDate(0, -i, 0)
		end := start.AddDate(0, 1, 0)
		var billed, collected float64
		h.db.Model(&models.Outstanding{}).
			Where("bill_date >= ? AND bill_date < ?", start, end).
			Select("COALESCE(SUM(amount),0)").Scan(&billed)
		h.db.Model(&models.Payment{}).
			Where("status <> ?", models.PaymentRejected).
			Where("COALESCE(paid_at, created_at) >= ? AND COALESCE(paid_at, created_at) < ?", start, end).
			Select("COALESCE(SUM(amount),0)").Scan(&collected)
		out = append(out, monthStat{Month: start.Format("Jan"), Billed: billed, Collected: collected})
	}
	return response.OK(c, out)
}

func (h *Handler) delete(c *fiber.Ctx) error {
	if err := h.db.Delete(&models.Outstanding{}, c.Params("id")).Error; err != nil {
		return response.Internal(c, "failed to delete bill")
	}
	return response.OKMessage(c, "deleted", nil)
}

// addAssignee assigns a staff member to a bill; returns the updated assignees.
func (h *Handler) addAssignee(c *fiber.Ctx) error {
	var o models.Outstanding
	if err := h.db.First(&o, c.Params("id")).Error; err != nil {
		return response.NotFound(c, "bill not found")
	}
	var in struct {
		StaffID uint `json:"staff_id"`
	}
	if err := c.BodyParser(&in); err != nil || in.StaffID == 0 {
		return response.BadRequest(c, "staff_id is required")
	}
	if err := h.db.Model(&o).Association("Assignees").Append(&models.StaffProfile{BaseModel: models.BaseModel{ID: in.StaffID}}); err != nil {
		return response.Internal(c, "failed to assign staff")
	}
	return h.assignees(c, o.ID)
}

// removeAssignee unassigns a staff member from a bill.
func (h *Handler) removeAssignee(c *fiber.Ctx) error {
	var o models.Outstanding
	if err := h.db.First(&o, c.Params("id")).Error; err != nil {
		return response.NotFound(c, "bill not found")
	}
	sid, _ := strconv.Atoi(c.Params("staffId"))
	if err := h.db.Model(&o).Association("Assignees").Delete(&models.StaffProfile{BaseModel: models.BaseModel{ID: uint(sid)}}); err != nil {
		return response.Internal(c, "failed to unassign staff")
	}
	return h.assignees(c, o.ID)
}

func (h *Handler) assignees(c *fiber.Ctx, billID uint) error {
	var o models.Outstanding
	if err := h.db.Preload("Assignees").First(&o, billID).Error; err != nil {
		return response.Internal(c, "failed to load assignees")
	}
	return response.OK(c, o.Assignees)
}

// RegisterRoutes mounts bill (outstanding) endpoints. Reads/writes are open to
// any authenticated user; staff are scoped to their own bills inside handlers.
func RegisterRoutes(api fiber.Router, db *gorm.DB, store storage.Storage) {
	h := NewHandler(db, store)
	g := api.Group("/outstandings")
	g.Get("/by-client", h.byClient)
	g.Get("/stats", h.stats)
	g.Get("/", h.list)
	g.Get("/:id", h.get)
	g.Post("/", h.create)
	g.Put("/:id", h.update)
	g.Post("/:id/payments", h.addPayment)
	g.Post("/:id/image", h.billImage)
	g.Post("/:id/assignees", h.addAssignee)
	g.Delete("/:id/assignees/:staffId", h.removeAssignee)
	g.Delete("/:id", middleware.RequireRole(models.RoleSuperAdmin, models.RoleAdmin), h.delete)
}
