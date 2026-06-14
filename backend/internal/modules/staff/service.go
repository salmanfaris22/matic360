package staff

import (
	"errors"
	"fmt"

	"github.com/salman/distribution/internal/models"
	"github.com/salman/distribution/internal/shared/pagination"
	"github.com/salman/distribution/internal/shared/security"
	"github.com/salman/distribution/internal/shared/storage"
	"gorm.io/gorm"
)

var (
	ErrNotFound    = errors.New("staff not found")
	ErrHasLogin    = errors.New("staff already has a portal login")
	ErrNoEmail     = errors.New("email is required to create a login")
)

// Service holds staff business logic.
type Service struct {
	repo  *Repository
	store storage.Storage
}

func NewService(repo *Repository, store storage.Storage) *Service {
	return &Service{repo: repo, store: store}
}

func (s *Service) List(p pagination.Params, f ListFilters) ([]models.StaffProfile, int64, error) {
	return s.repo.List(p, f)
}

func (s *Service) Get(id any) (*models.StaffProfile, error) {
	st, err := s.repo.FindByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return st, nil
}

func (s *Service) Create(req CreateRequest) (*models.StaffProfile, error) {
	empID := req.EmployeeID
	if empID == "" {
		empID = s.nextEmployeeID()
	}
	st := &models.StaffProfile{
		EmployeeID:     empID,
		Name:           req.Name,
		Phone:          req.Phone,
		SecondaryPhone: req.SecondaryPhone,
		Email:          req.Email,
		DOB:            parseDate(req.DOB),
		Address:        req.Address,
		AadhaarNumber:  req.AadhaarNumber,
		PANNumber:      req.PANNumber,
		JoiningDate:    parseDate(req.JoiningDate),
		Designation:     req.Designation,
		Salary:          req.Salary,
		Status:          normalizeStatus(req.Status),
		ShiftStart:      normalizeShift(req.ShiftStart, "09:00"),
		ShiftEnd:        normalizeShift(req.ShiftEnd, "17:00"),
		EmploymentType:  normalizeEmployment(req.EmploymentType),
		ContractEndDate: parseModelDate(req.ContractEnd),
		DepartmentID:    req.DepartmentID,
		BranchID:        req.BranchID,
	}
	if err := s.repo.Create(st); err != nil {
		return nil, err
	}
	return s.repo.FindByID(st.ID)
}

func (s *Service) Update(id any, req UpdateRequest) (*models.StaffProfile, error) {
	st, err := s.Get(id)
	if err != nil {
		return nil, err
	}
	st.Name = req.Name
	st.Phone = req.Phone
	st.SecondaryPhone = req.SecondaryPhone
	st.Email = req.Email
	st.DOB = parseDate(req.DOB)
	st.Address = req.Address
	st.AadhaarNumber = req.AadhaarNumber
	st.PANNumber = req.PANNumber
	st.JoiningDate = parseDate(req.JoiningDate)
	st.Designation = req.Designation
	st.Salary = req.Salary
	st.Status = normalizeStatus(req.Status)
	st.ShiftStart = normalizeShift(req.ShiftStart, "09:00")
	st.ShiftEnd = normalizeShift(req.ShiftEnd, "17:00")
	st.EmploymentType = normalizeEmployment(req.EmploymentType)
	st.ContractEndDate = parseModelDate(req.ContractEnd)
	st.DepartmentID = req.DepartmentID
	st.BranchID = req.BranchID

	if err := s.repo.Save(st); err != nil {
		return nil, err
	}
	return s.repo.FindByID(st.ID)
}

func (s *Service) Delete(id any) error {
	if _, err := s.Get(id); err != nil {
		return err
	}
	return s.repo.Delete(id)
}

// SetImage stores an uploaded image and saves its URL on the given field.
// kind is one of: photo, aadhaar, pan.
func (s *Service) SetImage(id any, kind string, url string) (*models.StaffProfile, error) {
	st, err := s.Get(id)
	if err != nil {
		return nil, err
	}
	switch kind {
	case "photo":
		s.deleteOld(st.PhotoURL)
		st.PhotoURL = url
	case "aadhaar":
		s.deleteOld(st.AadhaarImageURL)
		st.AadhaarImageURL = url
	case "pan":
		s.deleteOld(st.PANImageURL)
		st.PANImageURL = url
	default:
		return nil, fmt.Errorf("unknown image kind: %s", kind)
	}
	if err := s.repo.Save(st); err != nil {
		return nil, err
	}
	return s.repo.FindByID(st.ID)
}

func (s *Service) deleteOld(url string) {
	if url != "" {
		_ = s.store.Delete(url)
	}
}

// CreateLogin provisions a portal login (staff role) for a staff profile.
func (s *Service) CreateLogin(id any, email, password string) (*models.User, error) {
	st, err := s.Get(id)
	if err != nil {
		return nil, err
	}
	if st.UserID != nil {
		return nil, ErrHasLogin
	}
	if email == "" {
		email = st.Email
	}
	if email == "" {
		return nil, ErrNoEmail
	}
	roleID, err := s.repo.StaffRoleID()
	if err != nil {
		return nil, err
	}
	hash, err := security.HashPassword(password)
	if err != nil {
		return nil, err
	}
	return s.repo.CreateUserForStaff(st, email, hash, roleID)
}

// nextEmployeeID generates EMP0001, EMP0002, ... based on current count.
func (s *Service) nextEmployeeID() string {
	n, _ := s.repo.Count()
	return fmt.Sprintf("EMP%04d", n+1)
}
