package models

import (
	"time"

	"gorm.io/gorm"
)

// BaseModel is embedded in every entity to provide id + timestamps + soft delete.
type BaseModel struct {
	ID        uint           `gorm:"primarykey" json:"id"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

// AllModels returns every entity in dependency-friendly order for AutoMigrate.
func AllModels() []any {
	return []any{
		&Role{},
		&Branch{},
		&Department{},
		&User{},
		&StaffProfile{},
		&Attendance{},
		&AttendanceBreak{},
		&StaffTarget{},
		&Customer{},
		&Outstanding{},
		&Payment{},
		&Pickup{},
		&Salary{},
		&Expense{},
		&Product{},
		&NewArrival{},
		&DamageItem{},
		&Notification{},
		&AuditLog{},
	}
}
