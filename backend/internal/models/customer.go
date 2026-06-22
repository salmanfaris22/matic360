package models

import "time"

// ClientType classifies a client by their place in the supply chain.
type ClientType string

const (
	ClientRetailer    ClientType = "retailer"
	ClientWholesaler  ClientType = "wholesaler"
	ClientDistributor ClientType = "distributor"
)

// Customer is a client (shop/buyer) served by the distribution company.
type Customer struct {
	BaseModel
	Name              string     `gorm:"size:150;not null" json:"name"`
	ShopName          string     `gorm:"size:150" json:"shop_name"`
	ContactPerson     string     `gorm:"size:150" json:"contact_person"`
	Email             string     `gorm:"size:191" json:"email"`
	ClientType        ClientType `gorm:"size:30;default:'retailer'" json:"client_type"`
	Phone             string     `gorm:"size:20" json:"phone"`
	Address           string     `gorm:"size:255" json:"address"`
	District          string     `gorm:"size:100;index" json:"district"`
	GSTNumber         string     `gorm:"size:20" json:"gst_number"`
	CreditLimit       float64    `gorm:"type:numeric(12,2);default:0" json:"credit_limit"`
	OutstandingAmount float64    `gorm:"type:numeric(12,2);default:0" json:"outstanding_amount"`
	TotalPurchases    float64    `gorm:"type:numeric(14,2);default:0" json:"total_purchases"`
	LastPaymentAt     *time.Time `json:"last_payment_at,omitempty"`
	BranchID          *uint      `gorm:"index" json:"branch_id,omitempty"`
	Branch            *Branch    `gorm:"foreignKey:BranchID" json:"branch,omitempty"`
	IsActive          bool       `gorm:"default:true" json:"is_active"`
}

// OutstandingStatus enumerates credit-ledger states.
type OutstandingStatus string

const (
	OutOpen    OutstandingStatus = "open"
	OutPartial OutstandingStatus = "partial"
	OutClosed  OutstandingStatus = "closed"
)

// Outstanding is ONE customer bill. Staff add Payments against it over time;
// PaidAmount accumulates and the balance (Amount - PaidAmount) is what's due.
// Status closes automatically once fully paid.
type Outstanding struct {
	BaseModel
	CustomerID uint      `gorm:"not null;index" json:"customer_id"`
	Customer   *Customer `gorm:"foreignKey:CustomerID" json:"customer,omitempty"`

	RefCode    string `gorm:"size:20;uniqueIndex" json:"ref_code"` // auto e.g. OUT255T
	BillNumber string `gorm:"size:50;index" json:"bill_number"`
	ItemName   string `gorm:"size:150" json:"item_name"` // what the bill is for
	BillDate   *Date  `gorm:"index" json:"bill_date,omitempty"` // defaults to today on create

	Amount     float64 `gorm:"type:numeric(12,2);default:0" json:"amount"`      // total bill amount
	PaidAmount float64 `gorm:"type:numeric(12,2);default:0" json:"paid_amount"` // collected so far
	DueDate    *Date   `gorm:"index" json:"due_date,omitempty"`                 // next promised paying date
	ImageURL   string  `gorm:"size:512" json:"image_url"`                       // bill photo

	Description string            `gorm:"size:255" json:"description"`
	Status      OutstandingStatus `gorm:"size:20;default:'open'" json:"status"`
	CreatedBy   uint              `gorm:"index" json:"created_by"` // user id who raised the bill
	Creator     *User             `gorm:"foreignKey:CreatedBy" json:"creator,omitempty"`

	// Staff assigned to handle this bill (many-to-many; add/remove).
	Assignees []StaffProfile `gorm:"many2many:outstanding_assignees;" json:"assignees,omitempty"`

	Payments []Payment `gorm:"foreignKey:OutstandingID" json:"payments,omitempty"`
}

// Due returns the remaining balance on the bill.
func (o Outstanding) Due() float64 {
	d := o.Amount - o.PaidAmount
	if d < 0 {
		return 0
	}
	return d
}

// PaymentType enumerates collection methods.
type PaymentType string

const (
	PayCash     PaymentType = "cash"
	PayUPI      PaymentType = "upi"
	PayBank     PaymentType = "bank_transfer"
	PayCheque   PaymentType = "cheque"
)

// PaymentStatus tracks the Staff → Admin → Super Admin approval flow.
type PaymentStatus string

const (
	PaymentPending       PaymentStatus = "pending"
	PaymentAdminApproved PaymentStatus = "admin_approved"
	PaymentApproved      PaymentStatus = "approved" // super admin approved
	PaymentRejected      PaymentStatus = "rejected"
)

// Payment is one collection recorded by staff against an Outstanding bill.
// Multiple payments accumulate into the bill's PaidAmount over time.
type Payment struct {
	BaseModel
	CustomerID uint      `gorm:"not null;index" json:"customer_id"`
	Customer   *Customer `gorm:"foreignKey:CustomerID" json:"customer,omitempty"`

	// The bill this collection is applied to.
	OutstandingID *uint        `gorm:"index" json:"outstanding_id,omitempty"`
	Outstanding   *Outstanding `gorm:"foreignKey:OutstandingID" json:"outstanding,omitempty"`

	Amount      float64     `gorm:"type:numeric(12,2);default:0" json:"amount"`
	PaymentType PaymentType `gorm:"size:20" json:"payment_type"`

	// Cheque details (only when payment_type = cheque).
	ChequeNumber string `gorm:"size:50" json:"cheque_number"`
	BankName     string `gorm:"size:120" json:"bank_name"`

	// The next promised paying date the staff records with this collection;
	// it advances the parent bill's DueDate (drives the aging colour).
	NextPaymentDate *Date `gorm:"index" json:"next_payment_date,omitempty"`

	// ReceiptURL holds the uploaded receipt/cheque image.
	ReceiptURL string        `gorm:"size:512" json:"receipt_url"`
	Notes      string        `gorm:"size:255" json:"notes"`
	Status     PaymentStatus `gorm:"size:20;default:'pending'" json:"status"`

	CollectedBy uint       `gorm:"index" json:"collected_by"` // user id
	Collector   *User      `gorm:"foreignKey:CollectedBy" json:"collector,omitempty"`
	ApprovedBy  *uint      `json:"approved_by,omitempty"`
	PaidAt      *time.Time `json:"paid_at,omitempty"`
}

// PickupStatus enumerates fulfilment states.
type PickupStatus string

const (
	PickupPending   PickupStatus = "pending"
	PickupPicked    PickupStatus = "picked"
	PickupDelivered PickupStatus = "delivered"
)

// Pickup is a product pickup/delivery request for a customer.
type Pickup struct {
	BaseModel
	CustomerID  uint         `gorm:"not null;index" json:"customer_id"`
	Customer    *Customer    `gorm:"foreignKey:CustomerID" json:"customer,omitempty"`
	ProductID   *uint        `gorm:"index" json:"product_id,omitempty"`
	ProductName string       `gorm:"size:150" json:"product_name"`
	Quantity    int          `gorm:"default:0" json:"quantity"`
	PickupDate  *Date        `json:"pickup_date,omitempty"`
	Status      PickupStatus `gorm:"size:20;default:'pending'" json:"status"`
	AssignedTo  *uint        `gorm:"index" json:"assigned_to,omitempty"` // user id
	Notes       string       `gorm:"size:255" json:"notes"`
}
