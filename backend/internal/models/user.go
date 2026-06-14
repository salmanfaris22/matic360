package models

import (
	"time"

	"gorm.io/datatypes"
)

// Role slugs used throughout RBAC checks.
const (
	RoleSuperAdmin = "super_admin"
	RoleAdmin      = "admin"
	RoleStaff      = "staff"
)

// Role is an RBAC role. Permissions is a JSON array of permission keys
// (e.g. ["staff.read","staff.write"]). Super admin implicitly has all.
type Role struct {
	BaseModel
	Name        string         `gorm:"size:100;not null" json:"name"`
	Slug        string         `gorm:"size:100;uniqueIndex;not null" json:"slug"`
	Description string         `gorm:"size:255" json:"description"`
	IsSystem    bool           `gorm:"default:false" json:"is_system"`
	Permissions datatypes.JSON `gorm:"type:jsonb" json:"permissions"`
}

// User is a login account. Every staff member who can log in has a User;
// not every User is field staff (e.g. admins).
type User struct {
	BaseModel
	Name         string     `gorm:"size:150;not null" json:"name"`
	Email        string     `gorm:"size:191;uniqueIndex;not null" json:"email"`
	Phone        string     `gorm:"size:20" json:"phone"`
	PasswordHash string     `gorm:"size:255;not null" json:"-"`
	RoleID       uint       `gorm:"not null;index" json:"role_id"`
	Role         *Role      `gorm:"foreignKey:RoleID" json:"role,omitempty"`
	BranchID     *uint      `gorm:"index" json:"branch_id,omitempty"`
	Branch       *Branch    `gorm:"foreignKey:BranchID" json:"branch,omitempty"`
	IsActive     bool       `gorm:"default:true" json:"is_active"`
	LastLoginAt  *time.Time `json:"last_login_at,omitempty"`
}
