package models

import (
	"database/sql/driver"
	"fmt"
	"strings"
	"time"
)

// Date is a time.Time wrapper whose JSON accepts both "YYYY-MM-DD" and full
// RFC3339 timestamps, so clients (and <input type="date">) can send either.
// It persists as a normal timestamp column via GORM.
type Date struct {
	time.Time
}

var dateLayouts = []string{time.RFC3339, "2006-01-02T15:04:05", "2006-01-02"}

func (d *Date) UnmarshalJSON(b []byte) error {
	s := strings.Trim(string(b), `"`)
	if s == "" || s == "null" {
		d.Time = time.Time{}
		return nil
	}
	for _, layout := range dateLayouts {
		if t, err := time.Parse(layout, s); err == nil {
			d.Time = t
			return nil
		}
	}
	return fmt.Errorf("invalid date %q (use YYYY-MM-DD or RFC3339)", s)
}

func (d Date) MarshalJSON() ([]byte, error) {
	if d.Time.IsZero() {
		return []byte("null"), nil
	}
	return []byte(`"` + d.Time.Format(time.RFC3339) + `"`), nil
}

// Value implements driver.Valuer for database writes.
func (d Date) Value() (driver.Value, error) {
	if d.Time.IsZero() {
		return nil, nil
	}
	return d.Time, nil
}

// Scan implements sql.Scanner for database reads.
func (d *Date) Scan(v any) error {
	if v == nil {
		d.Time = time.Time{}
		return nil
	}
	if t, ok := v.(time.Time); ok {
		d.Time = t
		return nil
	}
	return fmt.Errorf("cannot scan %T into Date", v)
}
