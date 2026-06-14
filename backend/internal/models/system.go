package models

import (
	"time"

	"gorm.io/datatypes"
)

// ExpenseType enumerates expense categories.
type ExpenseType string

const (
	ExpFuel   ExpenseType = "fuel"
	ExpTravel ExpenseType = "travel"
	ExpFood   ExpenseType = "food"
	ExpOffice ExpenseType = "office"
	ExpMisc   ExpenseType = "miscellaneous"
)

// ExpenseStatus tracks the Staff → Admin approval flow.
type ExpenseStatus string

const (
	ExpensePending  ExpenseStatus = "pending"
	ExpenseApproved ExpenseStatus = "approved"
	ExpenseRejected ExpenseStatus = "rejected"
)

// Expense is a reimbursable cost logged by a user, optionally approved by admin.
type Expense struct {
	BaseModel
	UserID      uint          `gorm:"not null;index" json:"user_id"`
	User        *User         `gorm:"foreignKey:UserID" json:"user,omitempty"`
	ExpenseType ExpenseType   `gorm:"size:20" json:"expense_type"`
	Amount      float64       `gorm:"type:numeric(12,2);default:0" json:"amount"`
	BillURL     string        `gorm:"size:512" json:"bill_url"`
	Remarks     string        `gorm:"size:255" json:"remarks"`
	Status      ExpenseStatus `gorm:"size:20;default:'pending'" json:"status"`
	ApprovedBy  *uint         `json:"approved_by,omitempty"`
	BranchID    *uint         `gorm:"index" json:"branch_id,omitempty"`
	ExpenseDate *time.Time    `json:"expense_date,omitempty"`
}

// Notification is an in-app message addressed to a user.
type Notification struct {
	BaseModel
	UserID  uint       `gorm:"not null;index" json:"user_id"`
	Title   string     `gorm:"size:150" json:"title"`
	Message string     `gorm:"size:512" json:"message"`
	Type    string     `gorm:"size:50" json:"type"`
	IsRead  bool       `gorm:"default:false;index" json:"is_read"`
	ReadAt  *time.Time `json:"read_at,omitempty"`
}

// AuditLog records significant actions for traceability.
type AuditLog struct {
	BaseModel
	UserID   *uint          `gorm:"index" json:"user_id,omitempty"`
	Action   string         `gorm:"size:100;index" json:"action"`
	Entity   string         `gorm:"size:100;index" json:"entity"`
	EntityID *uint          `gorm:"index" json:"entity_id,omitempty"`
	Meta     datatypes.JSON `gorm:"type:jsonb" json:"meta,omitempty"`
	IP       string         `gorm:"size:64" json:"ip"`
}
