package attendance

import (
	"errors"
	"time"

	"github.com/salman/distribution/internal/models"
	"github.com/salman/distribution/internal/shared/pagination"
	"gorm.io/gorm"
)

var (
	ErrNoStaffProfile = errors.New("no staff profile linked to this account")
	ErrAlreadyIn      = errors.New("already checked in today")
	ErrNotCheckedIn   = errors.New("you have not checked in")
	ErrAlreadyOut     = errors.New("already checked out")
	ErrOnBreak        = errors.New("you are already on a break")
	ErrNotOnBreak     = errors.New("you are not on a break")
)

// parseTimeOn combines a calendar day with a "HH:MM" clock time (local zone).
// Returns ok=false when the clock string is invalid.
func parseTimeOn(day time.Time, hhmm string) (time.Time, bool) {
	t, err := time.Parse("15:04", hhmm)
	if err != nil {
		return time.Time{}, false
	}
	return time.Date(day.Year(), day.Month(), day.Day(), t.Hour(), t.Minute(), 0, 0, time.Local), true
}

// Geo carries a captured coordinate pair + selfie url + device label.
type Geo struct {
	Lat    float64
	Lng    float64
	Selfie string
	Device string
}

// Service holds attendance business logic.
type Service struct{ db *gorm.DB }

func NewService(db *gorm.DB) *Service { return &Service{db: db} }

// StaffForUser resolves the StaffProfile linked to a login account.
func (s *Service) StaffForUser(userID uint) (*models.StaffProfile, error) {
	var st models.StaffProfile
	err := s.db.Where("user_id = ?", userID).First(&st).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrNoStaffProfile
	}
	return &st, err
}

func startOfDay(t time.Time) time.Time {
	y, m, d := t.Date()
	return time.Date(y, m, d, 0, 0, 0, 0, t.Location())
}

// todayRecord finds (without creating) the staff member's record for today.
func (s *Service) todayRecord(staffID uint) (*models.Attendance, error) {
	day := startOfDay(time.Now())
	var att models.Attendance
	err := s.db.Where("staff_id = ? AND date = ?", staffID, day).First(&att).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	return &att, err
}

// Today returns today's record (or nil) for the user's staff profile.
func (s *Service) Today(userID uint) (*models.StaffProfile, *models.Attendance, error) {
	st, err := s.StaffForUser(userID)
	if err != nil {
		return nil, nil, err
	}
	rec, err := s.todayRecord(st.ID)
	return st, rec, err
}

// CheckIn opens today's attendance record for the user.
func (s *Service) CheckIn(userID uint, geo Geo) (*models.Attendance, error) {
	st, err := s.StaffForUser(userID)
	if err != nil {
		return nil, err
	}
	if rec, _ := s.todayRecord(st.ID); rec != nil && rec.CheckInAt != nil {
		return nil, ErrAlreadyIn
	}
	now := time.Now()
	// Late = checked in after the staff member's shift start time.
	status := models.AttPresent
	if cutoff, ok := parseTimeOn(now, st.ShiftStart); ok && now.After(cutoff) {
		status = models.AttLate
	}
	att := models.Attendance{
		StaffID:       st.ID,
		Date:          startOfDay(now),
		CheckInAt:     &now,
		CheckInLat:    geo.Lat,
		CheckInLng:    geo.Lng,
		CheckInSelfie: geo.Selfie,
		CheckInDevice: geo.Device,
		Status:        status,
	}
	if err := s.db.Create(&att).Error; err != nil {
		return nil, err
	}
	return &att, nil
}

func (s *Service) openRecord(userID uint) (*models.Attendance, error) {
	st, err := s.StaffForUser(userID)
	if err != nil {
		return nil, err
	}
	rec, err := s.todayRecord(st.ID)
	if err != nil {
		return nil, err
	}
	if rec == nil || rec.CheckInAt == nil {
		return nil, ErrNotCheckedIn
	}
	if rec.CheckOutAt != nil {
		return nil, ErrAlreadyOut
	}
	return rec, nil
}

// BreakStart begins a break on today's open record.
func (s *Service) BreakStart(userID uint) (*models.Attendance, error) {
	rec, err := s.openRecord(userID)
	if err != nil {
		return nil, err
	}
	if rec.OnBreak {
		return nil, ErrOnBreak
	}
	now := time.Now()
	rec.OnBreak = true
	rec.BreakStartedAt = &now
	return rec, s.db.Save(rec).Error
}

// BreakEnd ends the current break, accumulating its minutes.
func (s *Service) BreakEnd(userID uint) (*models.Attendance, error) {
	rec, err := s.openRecord(userID)
	if err != nil {
		return nil, err
	}
	if !rec.OnBreak || rec.BreakStartedAt == nil {
		return nil, ErrNotOnBreak
	}
	rec.BreakMinutes += time.Since(*rec.BreakStartedAt).Minutes()
	rec.OnBreak = false
	rec.BreakStartedAt = nil
	return rec, s.db.Save(rec).Error
}

// CheckOut closes today's record and computes working hours.
func (s *Service) CheckOut(userID uint, geo Geo) (*models.Attendance, error) {
	rec, err := s.openRecord(userID)
	if err != nil {
		return nil, err
	}
	now := time.Now()
	// Auto-end an open break.
	if rec.OnBreak && rec.BreakStartedAt != nil {
		rec.BreakMinutes += time.Since(*rec.BreakStartedAt).Minutes()
		rec.OnBreak = false
		rec.BreakStartedAt = nil
	}
	rec.CheckOutAt = &now
	rec.CheckOutLat = geo.Lat
	rec.CheckOutLng = geo.Lng
	rec.CheckOutSelfie = geo.Selfie
	rec.CheckOutDevice = geo.Device

	gross := now.Sub(*rec.CheckInAt).Hours()
	worked := gross - rec.BreakMinutes/60
	if worked < 0 {
		worked = 0
	}
	rec.WorkingHours = worked
	if worked > 0 && worked < 4 && rec.Status != models.AttLate {
		rec.Status = models.AttHalfDay
	}
	return rec, s.db.Save(rec).Error
}

// History lists the user's own attendance records (paginated).
func (s *Service) History(userID uint, p pagination.Params) ([]models.Attendance, int64, error) {
	st, err := s.StaffForUser(userID)
	if err != nil {
		return nil, 0, err
	}
	q := s.db.Model(&models.Attendance{}).Where("staff_id = ?", st.ID)
	var total int64
	q.Count(&total)
	var items []models.Attendance
	err = q.Order("date desc").Limit(p.PerPage).Offset(p.Offset()).Find(&items).Error
	return items, total, err
}

// AdminFilters narrow the admin attendance listing.
type AdminFilters struct {
	Date     string
	BranchID string
	StaffID  string
	Status   string
}

// AdminList returns all attendance records for review (paginated).
func (s *Service) AdminList(p pagination.Params, f AdminFilters) ([]models.Attendance, int64, error) {
	q := s.db.Model(&models.Attendance{}).Preload("Staff").Preload("Staff.Branch")
	if f.Date != "" {
		// Parse in the same (local) zone the day was stored in, then range-match
		// so the comparison is timezone-consistent.
		if d, err := time.ParseInLocation("2006-01-02", f.Date, time.Local); err == nil {
			start := startOfDay(d)
			q = q.Where("date >= ? AND date < ?", start, start.Add(24*time.Hour))
		}
	}
	if f.StaffID != "" {
		q = q.Where("staff_id = ?", f.StaffID)
	}
	if f.Status != "" {
		q = q.Where("status = ?", f.Status)
	}
	if f.BranchID != "" {
		q = q.Where("staff_id IN (SELECT id FROM staff_profiles WHERE branch_id = ?)", f.BranchID)
	}
	var total int64
	q.Count(&total)
	var items []models.Attendance
	err := q.Order("date desc, check_in_at desc").Limit(p.PerPage).Offset(p.Offset()).Find(&items).Error
	return items, total, err
}

// Verify marks a record as admin-verified.
func (s *Service) Verify(id string, adminID uint, notes string) (*models.Attendance, error) {
	var rec models.Attendance
	if err := s.db.First(&rec, id).Error; err != nil {
		return nil, err
	}
	rec.IsVerified = true
	rec.VerifiedBy = &adminID
	if notes != "" {
		rec.Notes = notes
	}
	return &rec, s.db.Save(&rec).Error
}
