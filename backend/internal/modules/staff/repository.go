package staff

import (
	"github.com/salman/distribution/internal/models"
	"github.com/salman/distribution/internal/shared/pagination"
	"gorm.io/gorm"
)

// Repository encapsulates all staff DB access.
type Repository struct{ db *gorm.DB }

func NewRepository(db *gorm.DB) *Repository { return &Repository{db: db} }

func (r *Repository) List(p pagination.Params, f ListFilters) ([]models.StaffProfile, int64, error) {
	q := r.db.Model(&models.StaffProfile{}).
		Preload("Department").Preload("Branch")

	if p.Search != "" {
		like := "%" + p.Search + "%"
		q = q.Where("name ILIKE ? OR employee_id ILIKE ? OR phone ILIKE ? OR email ILIKE ?", like, like, like, like)
	}
	if f.BranchID != nil {
		q = q.Where("branch_id = ?", *f.BranchID)
	}
	if f.DepartmentID != nil {
		q = q.Where("department_id = ?", *f.DepartmentID)
	}
	if f.Status != "" {
		q = q.Where("status = ?", f.Status)
	}

	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	var items []models.StaffProfile
	if err := p.Apply(q).Find(&items).Error; err != nil {
		return nil, 0, err
	}
	return items, total, nil
}

func (r *Repository) FindByID(id any) (*models.StaffProfile, error) {
	var s models.StaffProfile
	err := r.db.Preload("Department").Preload("Branch").Preload("User").First(&s, id).Error
	if err != nil {
		return nil, err
	}
	return &s, nil
}

func (r *Repository) Create(s *models.StaffProfile) error { return r.db.Create(s).Error }

func (r *Repository) Save(s *models.StaffProfile) error { return r.db.Save(s).Error }

func (r *Repository) Delete(id any) error {
	return r.db.Delete(&models.StaffProfile{}, id).Error
}

func (r *Repository) Count() (int64, error) {
	var n int64
	err := r.db.Model(&models.StaffProfile{}).Count(&n).Error
	return n, err
}

// StaffRoleID returns the id of the seeded "staff" role.
func (r *Repository) StaffRoleID() (uint, error) {
	var role models.Role
	err := r.db.Where("slug = ?", models.RoleStaff).First(&role).Error
	return role.ID, err
}

// CreateUserForStaff creates a login account and links it to the staff profile.
func (r *Repository) CreateUserForStaff(st *models.StaffProfile, email, hash string, roleID uint) (*models.User, error) {
	u := &models.User{
		Name:         st.Name,
		Email:        email,
		Phone:        st.Phone,
		PasswordHash: hash,
		RoleID:       roleID,
		BranchID:     st.BranchID,
		IsActive:     true,
	}
	if err := r.db.Create(u).Error; err != nil {
		return nil, err
	}
	st.UserID = &u.ID
	if err := r.db.Save(st).Error; err != nil {
		return nil, err
	}
	return u, nil
}
