package database

import (
	"encoding/json"
	"log"

	"github.com/salman/distribution/internal/config"
	"github.com/salman/distribution/internal/models"
	"github.com/salman/distribution/internal/shared/security"
	"gorm.io/datatypes"
	"gorm.io/gorm"
)

// Permission catalogs per role. Super admin uses the wildcard "*".
var (
	adminPermissions = []string{
		"staff.read", "staff.write",
		"customer.read", "customer.write",
		"attendance.read", "attendance.write",
		"payment.read", "payment.approve",
		"expense.read", "expense.approve",
		"product.read", "product.write",
		"damage.read", "damage.write",
		"pickup.read", "pickup.write",
		"outstanding.read", "outstanding.write",
		"salary.read",
		"report.read",
		"branch.read", "department.read", "role.read",
	}
	staffPermissions = []string{
		"attendance.self", "payment.create", "expense.create",
		"customer.read", "outstanding.read",
		"pickup.read", "pickup.update",
		"salary.self", "product.read",
	}
)

// Seed inserts baseline data (roles, head office, departments, super admin)
// on first run. It is idempotent — existing records are left untouched.
func Seed(db *gorm.DB, cfg *config.Config) error {
	superRole, err := ensureRole(db, "Super Admin", models.RoleSuperAdmin, "Full system access", []string{"*"})
	if err != nil {
		return err
	}
	if _, err := ensureRole(db, "Admin", models.RoleAdmin, "Branch & operations management", adminPermissions); err != nil {
		return err
	}
	if _, err := ensureRole(db, "Staff", models.RoleStaff, "Field staff portal", staffPermissions); err != nil {
		return err
	}

	branch, err := ensureHeadOffice(db)
	if err != nil {
		return err
	}

	for _, d := range []string{"Sales", "Logistics", "Accounts", "Administration"} {
		if err := ensureDepartment(db, d); err != nil {
			return err
		}
	}

	if err := ensureSuperAdmin(db, cfg, superRole.ID, branch.ID); err != nil {
		return err
	}

	return nil
}

func ensureRole(db *gorm.DB, name, slug, desc string, perms []string) (*models.Role, error) {
	var role models.Role
	err := db.Where("slug = ?", slug).First(&role).Error
	if err == nil {
		return &role, nil
	}
	if err != gorm.ErrRecordNotFound {
		return nil, err
	}
	permJSON, _ := json.Marshal(perms)
	role = models.Role{
		Name:        name,
		Slug:        slug,
		Description: desc,
		IsSystem:    true,
		Permissions: datatypes.JSON(permJSON),
	}
	if err := db.Create(&role).Error; err != nil {
		return nil, err
	}
	log.Printf("🌱 seeded role: %s", slug)
	return &role, nil
}

func ensureHeadOffice(db *gorm.DB) (*models.Branch, error) {
	var branch models.Branch
	err := db.Where("is_head_office = ?", true).First(&branch).Error
	if err == nil {
		return &branch, nil
	}
	if err != gorm.ErrRecordNotFound {
		return nil, err
	}
	branch = models.Branch{
		Name:         "Head Office",
		Code:         "HO",
		IsHeadOffice: true,
		IsActive:     true,
	}
	if err := db.Create(&branch).Error; err != nil {
		return nil, err
	}
	log.Println("🌱 seeded head office branch")
	return &branch, nil
}

func ensureDepartment(db *gorm.DB, name string) error {
	var dept models.Department
	err := db.Where("name = ?", name).First(&dept).Error
	if err == nil {
		return nil
	}
	if err != gorm.ErrRecordNotFound {
		return err
	}
	dept = models.Department{Name: name, IsActive: true}
	if err := db.Create(&dept).Error; err != nil {
		return err
	}
	log.Printf("🌱 seeded department: %s", name)
	return nil
}

func ensureSuperAdmin(db *gorm.DB, cfg *config.Config, roleID, branchID uint) error {
	var user models.User
	err := db.Where("email = ?", cfg.Seed.SuperAdminEmail).First(&user).Error
	if err == nil {
		return nil
	}
	if err != gorm.ErrRecordNotFound {
		return err
	}
	hash, err := security.HashPassword(cfg.Seed.SuperAdminPassword)
	if err != nil {
		return err
	}
	bID := branchID
	user = models.User{
		Name:         cfg.Seed.SuperAdminName,
		Email:        cfg.Seed.SuperAdminEmail,
		PasswordHash: hash,
		RoleID:       roleID,
		BranchID:     &bID,
		IsActive:     true,
	}
	if err := db.Create(&user).Error; err != nil {
		return err
	}
	log.Printf("🌱 seeded super admin: %s", cfg.Seed.SuperAdminEmail)
	return nil
}
