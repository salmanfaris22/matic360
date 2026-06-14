package staff

import (
	"time"

	"github.com/salman/distribution/internal/models"
)

// CreateRequest is the payload to create a staff profile.
type CreateRequest struct {
	EmployeeID     string  `json:"employee_id"` // optional — auto-generated if empty
	Name           string  `json:"name" validate:"required,min=2"`
	Phone          string  `json:"phone"`
	SecondaryPhone string  `json:"secondary_phone"`
	Email          string  `json:"email" validate:"omitempty,email"`
	DOB            string  `json:"dob"`          // YYYY-MM-DD
	Address        string  `json:"address"`
	AadhaarNumber  string  `json:"aadhaar_number"`
	PANNumber      string  `json:"pan_number"`
	JoiningDate    string  `json:"joining_date"` // YYYY-MM-DD
	Designation    string  `json:"designation"`
	Salary         float64 `json:"salary"`
	Status         string  `json:"status"`
	ShiftStart     string  `json:"shift_start"` // HH:MM
	ShiftEnd       string  `json:"shift_end"`   // HH:MM
	EmploymentType string  `json:"employment_type"`
	ContractEnd    string  `json:"contract_end_date"`
	DepartmentID   *uint   `json:"department_id"`
	BranchID       *uint   `json:"branch_id"`
}

// UpdateRequest is the payload to update a staff profile.
type UpdateRequest struct {
	Name           string  `json:"name" validate:"required,min=2"`
	Phone          string  `json:"phone"`
	SecondaryPhone string  `json:"secondary_phone"`
	Email          string  `json:"email" validate:"omitempty,email"`
	DOB            string  `json:"dob"`
	Address        string  `json:"address"`
	AadhaarNumber  string  `json:"aadhaar_number"`
	PANNumber      string  `json:"pan_number"`
	JoiningDate    string  `json:"joining_date"`
	Designation    string  `json:"designation"`
	Salary         float64 `json:"salary"`
	Status         string  `json:"status"`
	ShiftStart     string  `json:"shift_start"`
	ShiftEnd       string  `json:"shift_end"`
	EmploymentType string  `json:"employment_type"`
	ContractEnd    string  `json:"contract_end_date"`
	DepartmentID   *uint   `json:"department_id"`
	BranchID       *uint   `json:"branch_id"`
}

// ListFilters narrows the staff listing.
type ListFilters struct {
	BranchID     *uint
	DepartmentID *uint
	Status       string
}

func parseDate(s string) *time.Time {
	if s == "" {
		return nil
	}
	if t, err := time.Parse("2006-01-02", s); err == nil {
		return &t
	}
	if t, err := time.Parse(time.RFC3339, s); err == nil {
		return &t
	}
	return nil
}

func normalizeStatus(s string) models.StaffStatus {
	switch models.StaffStatus(s) {
	case models.StaffActive, models.StaffInactive, models.StaffResigned, models.StaffTerminated:
		return models.StaffStatus(s)
	default:
		return models.StaffActive
	}
}

func normalizeEmployment(s string) models.EmploymentType {
	switch models.EmploymentType(s) {
	case models.EmploymentFullTime, models.EmploymentTemporary, models.EmploymentContract:
		return models.EmploymentType(s)
	default:
		return models.EmploymentFullTime
	}
}

// normalizeShift validates "HH:MM"; returns fallback on bad/empty input.
func normalizeShift(s, fallback string) string {
	if t, err := time.Parse("15:04", s); err == nil {
		return t.Format("15:04")
	}
	return fallback
}

// parseModelDate parses an optional date string into a *models.Date.
func parseModelDate(s string) *models.Date {
	t := parseDate(s)
	if t == nil {
		return nil
	}
	return &models.Date{Time: *t}
}
