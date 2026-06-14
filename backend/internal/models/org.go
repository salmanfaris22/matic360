package models

// Branch is a company location. One branch may be flagged as the head office.
type Branch struct {
	BaseModel
	Name         string  `gorm:"size:150;not null" json:"name"`
	Code         string  `gorm:"size:50;uniqueIndex" json:"code"`
	Address      string  `gorm:"size:255" json:"address"`
	District     string  `gorm:"size:100" json:"district"`
	Phone        string  `gorm:"size:20" json:"phone"`
	ManagerID    *uint   `gorm:"index" json:"manager_id,omitempty"`
	IsHeadOffice bool    `gorm:"default:false" json:"is_head_office"`
	IsActive     bool    `gorm:"default:true" json:"is_active"`
}

// Department groups staff by function (Sales, Logistics, Accounts, ...).
type Department struct {
	BaseModel
	Name        string `gorm:"size:150;not null" json:"name"`
	Description string `gorm:"size:255" json:"description"`
	IsActive    bool   `gorm:"default:true" json:"is_active"`
}
