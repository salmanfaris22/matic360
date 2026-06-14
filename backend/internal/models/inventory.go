package models

// Product is the product master record.
type Product struct {
	BaseModel
	Name     string  `gorm:"size:150;not null" json:"name"`
	SKU      string  `gorm:"size:80;uniqueIndex" json:"sku"`
	Category string  `gorm:"size:100;index" json:"category"`
	Stock    int     `gorm:"default:0" json:"stock"`
	Price    float64 `gorm:"type:numeric(12,2);default:0" json:"price"`
	ImageURL string  `gorm:"size:512" json:"image_url"`
	BranchID *uint   `gorm:"index" json:"branch_id,omitempty"`
	IsActive bool    `gorm:"default:true" json:"is_active"`
}

// NewArrival highlights a recently launched product (staff get notified).
type NewArrival struct {
	BaseModel
	ProductID   *uint      `gorm:"index" json:"product_id,omitempty"`
	Name        string     `gorm:"size:150;not null" json:"name"`
	ImageURL    string `gorm:"size:512" json:"image_url"`
	Description string `gorm:"size:512" json:"description"`
	LaunchDate  *Date  `json:"launch_date,omitempty"`
}

// DamageItem records damaged/lost stock with a reason and photo.
type DamageItem struct {
	BaseModel
	ProductID   *uint    `gorm:"index" json:"product_id,omitempty"`
	ProductName string   `gorm:"size:150" json:"product_name"`
	Quantity    int      `gorm:"default:0" json:"quantity"`
	Reason      string   `gorm:"size:255" json:"reason"`
	PhotoURL    string   `gorm:"size:512" json:"photo_url"`
	ReportedBy  uint     `gorm:"index" json:"reported_by"` // user id
	BranchID    *uint    `gorm:"index" json:"branch_id,omitempty"`
	Branch      *Branch  `gorm:"foreignKey:BranchID" json:"branch,omitempty"`
}
