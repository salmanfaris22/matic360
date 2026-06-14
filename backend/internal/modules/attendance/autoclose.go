package attendance

import (
	"log"
	"time"

	"github.com/salman/distribution/internal/models"
)

// autoCloseInterval is how often the worker scans for stale open records.
const autoCloseInterval = 10 * time.Minute

// StartAutoCloseWorker launches a background loop that checks out any staff who
// forgot to check out (or end their break) by their shift end time. The
// check-out timestamp is set to that day's shift-end (e.g. 17:00), NOT midnight.
func StartAutoCloseWorker(svc *Service) {
	go func() {
		// Run once on boot to clean up anything left open, then on an interval.
		if n, err := svc.AutoCloseStale(); err != nil {
			log.Printf("⚠️  auto-close error: %v", err)
		} else if n > 0 {
			log.Printf("🕔 auto-closed %d stale attendance record(s)", n)
		}
		ticker := time.NewTicker(autoCloseInterval)
		defer ticker.Stop()
		for range ticker.C {
			if n, err := svc.AutoCloseStale(); err != nil {
				log.Printf("⚠️  auto-close error: %v", err)
			} else if n > 0 {
				log.Printf("🕔 auto-closed %d stale attendance record(s)", n)
			}
		}
	}()
}

// AutoCloseStale finds open attendance records whose shift-end has passed and
// checks them out at the shift-end time. Returns the number closed.
func (s *Service) AutoCloseStale() (int, error) {
	var open []models.Attendance
	if err := s.db.
		Where("check_in_at IS NOT NULL AND check_out_at IS NULL").
		Find(&open).Error; err != nil {
		return 0, err
	}

	now := time.Now()
	closed := 0
	for i := range open {
		rec := &open[i]

		// Resolve the staff member's shift-end on the record's own day.
		var st models.StaffProfile
		if err := s.db.First(&st, rec.StaffID).Error; err != nil {
			continue
		}
		shiftEnd, ok := parseTimeOn(rec.Date, st.ShiftEnd)
		if !ok {
			shiftEnd, _ = parseTimeOn(rec.Date, "17:00")
		}
		if !now.After(shiftEnd) {
			continue // shift not over yet
		}

		// Close an open break at shift-end.
		if rec.OnBreak && rec.BreakStartedAt != nil {
			mins := shiftEnd.Sub(*rec.BreakStartedAt).Minutes()
			if mins > 0 {
				rec.BreakMinutes += mins
			}
			rec.OnBreak = false
			rec.BreakStartedAt = nil
		}

		rec.CheckOutAt = &shiftEnd
		rec.CheckOutDevice = "auto (shift end)"
		worked := shiftEnd.Sub(*rec.CheckInAt).Hours() - rec.BreakMinutes/60
		if worked < 0 {
			worked = 0
		}
		rec.WorkingHours = worked
		rec.AutoClosed = true
		if worked > 0 && worked < 4 && rec.Status != models.AttLate {
			rec.Status = models.AttHalfDay
		}
		if err := s.db.Save(rec).Error; err != nil {
			return closed, err
		}
		closed++
	}
	return closed, nil
}
