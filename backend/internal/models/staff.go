package models

import (
	"time"

	"gorm.io/gorm"
)

// StaffStatus enumerates employment states.
type StaffStatus string

const (
	StaffActive     StaffStatus = "active"
	StaffInactive   StaffStatus = "inactive"
	StaffResigned   StaffStatus = "resigned"
	StaffTerminated StaffStatus = "terminated"
)

// EmploymentType enumerates how a staff member is engaged.
type EmploymentType string

const (
	EmploymentFullTime  EmploymentType = "full_time"
	EmploymentTemporary EmploymentType = "temporary"
	EmploymentContract  EmploymentType = "contract"
)

// StaffProfile is the employee record. UserID links to a login account
// (nullable: a profile can exist before/without portal access).
type StaffProfile struct {
	BaseModel
	EmployeeID      string      `gorm:"size:50;uniqueIndex;not null" json:"employee_id"`
	Name            string      `gorm:"size:150;not null" json:"name"`
	Phone           string      `gorm:"size:20" json:"phone"`
	SecondaryPhone  string      `gorm:"size:20" json:"secondary_phone"`
	Email           string      `gorm:"size:191" json:"email"`
	DOB             *time.Time  `json:"dob,omitempty"`
	Address         string      `gorm:"size:255" json:"address"`
	AadhaarNumber   string      `gorm:"size:20" json:"aadhaar_number"`
	PANNumber       string      `gorm:"size:20" json:"pan_number"`
	PhotoURL        string      `gorm:"size:512" json:"photo_url"`
	AadhaarImageURL string      `gorm:"size:512" json:"aadhaar_image_url"`
	PANImageURL     string      `gorm:"size:512" json:"pan_image_url"`
	JoiningDate     *time.Time  `json:"joining_date,omitempty"`
	Designation     string      `gorm:"size:100" json:"designation"`
	Salary          float64     `gorm:"type:numeric(12,2);default:0" json:"salary"`
	Status          StaffStatus `gorm:"size:20;default:'active'" json:"status"`

	// MonthlyTarget is the staff member's default monthly collection goal; a
	// monthly StaffTarget is auto-created each month from this amount.
	MonthlyTarget float64 `gorm:"type:numeric(12,2);default:0" json:"monthly_target"`

	// Work shift (24h "HH:MM") — drives late detection and auto check-out.
	ShiftStart string `gorm:"size:5;default:'09:00'" json:"shift_start"`
	ShiftEnd   string `gorm:"size:5;default:'17:00'" json:"shift_end"`

	// Engagement type; contract/temporary may carry an end date.
	EmploymentType  EmploymentType `gorm:"size:20;default:'full_time'" json:"employment_type"`
	ContractEndDate *Date          `json:"contract_end_date,omitempty"`

	DepartmentID *uint       `gorm:"index" json:"department_id,omitempty"`
	Department   *Department `gorm:"foreignKey:DepartmentID" json:"department,omitempty"`
	BranchID     *uint       `gorm:"index" json:"branch_id,omitempty"`
	Branch       *Branch     `gorm:"foreignKey:BranchID" json:"branch,omitempty"`
	UserID       *uint       `gorm:"index" json:"user_id,omitempty"`
	User         *User       `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

// AttendanceStatus enumerates daily attendance outcomes.
type AttendanceStatus string

const (
	AttPresent  AttendanceStatus = "present"
	AttAbsent   AttendanceStatus = "absent"
	AttLate     AttendanceStatus = "late"
	AttHalfDay  AttendanceStatus = "half_day"
)

// Attendance captures one staff member's check-in/check-out for a date,
// including GPS coordinates, selfie image and device.
type Attendance struct {
	BaseModel
	StaffID uint      `gorm:"not null;index" json:"staff_id"`
	Staff   *StaffProfile `gorm:"foreignKey:StaffID" json:"staff,omitempty"`
	Date    time.Time `gorm:"index" json:"date"`

	CheckInAt      *time.Time `json:"check_in_at,omitempty"`
	CheckInLat     float64    `json:"check_in_lat"`
	CheckInLng     float64    `json:"check_in_lng"`
	CheckInSelfie  string     `gorm:"size:512" json:"check_in_selfie"`
	CheckInDevice  string     `gorm:"size:191" json:"check_in_device"`

	CheckOutAt     *time.Time `json:"check_out_at,omitempty"`
	CheckOutLat    float64    `json:"check_out_lat"`
	CheckOutLng    float64    `json:"check_out_lng"`
	CheckOutSelfie string     `gorm:"size:512" json:"check_out_selfie"`
	CheckOutDevice string     `gorm:"size:191" json:"check_out_device"`

	// Break tracking — supports multiple breaks; minutes accumulate. Each
	// individual break is also recorded in Breaks so the admin can see every
	// break's start/end, not just the running total.
	OnBreak        bool              `gorm:"default:false" json:"on_break"`
	BreakStartedAt *time.Time        `json:"break_started_at,omitempty"`
	BreakMinutes   float64           `gorm:"type:numeric(6,2);default:0" json:"break_minutes"`
	Breaks         []AttendanceBreak `gorm:"foreignKey:AttendanceID" json:"breaks,omitempty"`

	WorkingHours float64          `gorm:"type:numeric(5,2);default:0" json:"working_hours"`
	Status       AttendanceStatus `gorm:"size:20;default:'present'" json:"status"`

	// AutoClosed marks records the system checked out at shift-end because the
	// staff forgot to check out / end their break.
	AutoClosed bool `gorm:"default:false" json:"auto_closed"`

	// Admin verification.
	IsVerified bool   `gorm:"default:false" json:"is_verified"`
	VerifiedBy *uint  `json:"verified_by,omitempty"`
	Notes      string `gorm:"size:255" json:"notes"`
}

// AttendanceBreak is one break session within a day's attendance record.
// EndedAt is nil while the break is in progress.
type AttendanceBreak struct {
	BaseModel
	AttendanceID uint       `gorm:"not null;index" json:"attendance_id"`
	StartedAt    time.Time  `json:"started_at"`
	EndedAt      *time.Time `json:"ended_at,omitempty"`
	Minutes      float64    `gorm:"type:numeric(6,2);default:0" json:"minutes"`
}

// SalaryStatus enumerates payroll states.
type SalaryStatus string

const (
	SalaryPending  SalaryStatus = "pending"
	SalaryApproved SalaryStatus = "approved"
	SalaryPaid     SalaryStatus = "paid"
)

// Salary is one staff member's payroll record for a month/year.
type Salary struct {
	BaseModel
	StaffID    uint          `gorm:"not null;index" json:"staff_id"`
	Staff      *StaffProfile `gorm:"foreignKey:StaffID" json:"staff,omitempty"`
	Month      int           `gorm:"index" json:"month"` // 1-12
	Year       int           `gorm:"index" json:"year"`
	Basic      float64       `gorm:"type:numeric(12,2);default:0" json:"basic"`
	Allowances float64       `gorm:"type:numeric(12,2);default:0" json:"allowances"`
	Incentives float64       `gorm:"type:numeric(12,2);default:0" json:"incentives"`
	Bonus      float64       `gorm:"type:numeric(12,2);default:0" json:"bonus"`
	Deductions float64       `gorm:"type:numeric(12,2);default:0" json:"deductions"`
	NetAmount  float64       `gorm:"type:numeric(12,2);default:0" json:"net_amount"`
	Status     SalaryStatus  `gorm:"size:20;default:'pending'" json:"status"`
	ApprovedBy *uint         `json:"approved_by,omitempty"`
	PaidAt     *time.Time    `json:"paid_at,omitempty"`
}

// BeforeSave keeps NetAmount in sync with the salary components.
func (s *Salary) BeforeSave(*gorm.DB) error {
	s.NetAmount = s.Basic + s.Allowances + s.Incentives + s.Bonus - s.Deductions
	return nil
}

// TargetPeriod enumerates the durations a collection target can cover.
type TargetPeriod string

const (
	TargetWeekly     TargetPeriod = "weekly"
	TargetMonthly    TargetPeriod = "monthly"
	TargetQuarterly  TargetPeriod = "quarterly"   // 3 months
	TargetHalfYearly TargetPeriod = "half_yearly" // 6 months
	TargetYearly     TargetPeriod = "yearly"
)

// StaffTarget is one collection goal for a staff member over a date range.
// Progress is paid-based: the sum of payments that staff collected within
// [StartDate, EndDate]. Achieved is computed on read (not persisted).
type StaffTarget struct {
	BaseModel
	StaffID   uint          `gorm:"not null;index" json:"staff_id"`
	Staff     *StaffProfile `gorm:"foreignKey:StaffID" json:"staff,omitempty"`
	Period    TargetPeriod  `gorm:"size:20;index" json:"period"`
	StartDate Date          `gorm:"index" json:"start_date"`
	EndDate   Date          `gorm:"index" json:"end_date"`
	Amount    float64       `gorm:"type:numeric(12,2);default:0" json:"amount"`
	AutoGen   bool          `gorm:"default:false" json:"auto_gen"` // created by the monthly auto-generator
	Notes     string        `gorm:"size:255" json:"notes"`

	// Achieved is filled in by the service layer from collected payments.
	Achieved float64 `gorm:"-" json:"achieved"`
}
