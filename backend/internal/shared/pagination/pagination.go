package pagination

import (
	"strconv"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

const (
	defaultPage    = 1
	defaultPerPage = 20
	maxPerPage     = 100
)

// Params captures pagination + search query parameters from the request.
type Params struct {
	Page    int    `json:"page"`
	PerPage int    `json:"per_page"`
	Search  string `json:"search"`
	Sort    string `json:"sort"` // e.g. "created_at desc"
}

// Meta is returned to the client alongside a page of data.
type Meta struct {
	Page       int   `json:"page"`
	PerPage    int   `json:"per_page"`
	Total      int64 `json:"total"`
	TotalPages int   `json:"total_pages"`
}

// FromContext extracts pagination params from query string.
func FromContext(c *fiber.Ctx) Params {
	page, _ := strconv.Atoi(c.Query("page", strconv.Itoa(defaultPage)))
	perPage, _ := strconv.Atoi(c.Query("per_page", strconv.Itoa(defaultPerPage)))
	if page < 1 {
		page = defaultPage
	}
	if perPage < 1 {
		perPage = defaultPerPage
	}
	if perPage > maxPerPage {
		perPage = maxPerPage
	}
	return Params{
		Page:    page,
		PerPage: perPage,
		Search:  c.Query("search"),
		Sort:    c.Query("sort"),
	}
}

// Offset computes the SQL offset for the current page.
func (p Params) Offset() int { return (p.Page - 1) * p.PerPage }

// Apply adds LIMIT/OFFSET (and optional ORDER BY) to a query.
func (p Params) Apply(db *gorm.DB) *gorm.DB {
	q := db.Limit(p.PerPage).Offset(p.Offset())
	if p.Sort != "" {
		q = q.Order(p.Sort)
	} else {
		q = q.Order("created_at desc")
	}
	return q
}

// BuildMeta computes pagination metadata from a total count.
func (p Params) BuildMeta(total int64) Meta {
	totalPages := int((total + int64(p.PerPage) - 1) / int64(p.PerPage))
	return Meta{
		Page:       p.Page,
		PerPage:    p.PerPage,
		Total:      total,
		TotalPages: totalPages,
	}
}
