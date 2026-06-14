// Package crud provides a generic, paginated REST handler for simple resources.
// It removes the boilerplate of list/get/create/update/delete for every module
// while leaving room for modules to add custom endpoints alongside it.
package crud

import (
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/salman/distribution/internal/shared/pagination"
	"github.com/salman/distribution/internal/shared/response"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// Config tunes the generic handler for a specific model.
type Config struct {
	Search  []string // columns matched with ILIKE on ?search=
	Preload []string // associations eager-loaded on list/get
	Filters []string // query params mapped to exact-match WHERE columns
	OrderBy string   // default ordering (falls back to created_at desc)
}

// Handler is a generic CRUD handler bound to model type T.
type Handler[T any] struct {
	db  *gorm.DB
	cfg Config
}

func New[T any](db *gorm.DB, cfg Config) *Handler[T] {
	return &Handler[T]{db: db, cfg: cfg}
}

func (h *Handler[T]) base() *gorm.DB {
	q := h.db.Model(new(T))
	for _, p := range h.cfg.Preload {
		q = q.Preload(p)
	}
	return q
}

// List returns a paginated, optionally searched/filtered collection.
func (h *Handler[T]) List(c *fiber.Ctx) error {
	p := pagination.FromContext(c)
	if p.Sort == "" {
		p.Sort = h.cfg.OrderBy
	}
	q := h.base()

	if p.Search != "" && len(h.cfg.Search) > 0 {
		var clauses []string
		var args []any
		for _, col := range h.cfg.Search {
			clauses = append(clauses, col+" ILIKE ?")
			args = append(args, "%"+p.Search+"%")
		}
		q = q.Where(strings.Join(clauses, " OR "), args...)
	}
	for _, f := range h.cfg.Filters {
		if v := c.Query(f); v != "" {
			q = q.Where(f+" = ?", v)
		}
	}

	var total int64
	if err := q.Count(&total).Error; err != nil {
		return response.Internal(c, "failed to count records")
	}
	var items []T
	if err := p.Apply(q).Find(&items).Error; err != nil {
		return response.Internal(c, "failed to list records")
	}
	return response.Paginated(c, items, p.BuildMeta(total))
}

// Get returns a single record by id.
func (h *Handler[T]) Get(c *fiber.Ctx) error {
	var item T
	if err := h.base().First(&item, c.Params("id")).Error; err != nil {
		return response.NotFound(c, "record not found")
	}
	return response.OK(c, item)
}

// Create inserts a new record from the JSON body (associations omitted).
func (h *Handler[T]) Create(c *fiber.Ctx) error {
	var item T
	if err := c.BodyParser(&item); err != nil {
		return response.BadRequest(c, "invalid request body")
	}
	if err := h.db.Omit(clause.Associations).Create(&item).Error; err != nil {
		return response.Conflict(c, "failed to create record: "+err.Error())
	}
	return response.Created(c, item)
}

// Update merges the JSON body into an existing record.
func (h *Handler[T]) Update(c *fiber.Ctx) error {
	var item T
	if err := h.db.First(&item, c.Params("id")).Error; err != nil {
		return response.NotFound(c, "record not found")
	}
	if err := c.BodyParser(&item); err != nil {
		return response.BadRequest(c, "invalid request body")
	}
	if err := h.db.Omit(clause.Associations).Save(&item).Error; err != nil {
		return response.Internal(c, "failed to update record")
	}
	_ = h.base().First(&item, c.Params("id")).Error
	return response.OK(c, item)
}

// Delete soft-deletes a record by id.
func (h *Handler[T]) Delete(c *fiber.Ctx) error {
	if err := h.db.Delete(new(T), c.Params("id")).Error; err != nil {
		return response.Internal(c, "failed to delete record")
	}
	return response.OKMessage(c, "deleted", nil)
}

// Register mounts standard routes. readMW guards reads; writeMW guards writes.
func (h *Handler[T]) Register(router fiber.Router, path string, readMW, writeMW fiber.Handler) {
	g := router.Group(path)
	g.Get("/", readMW, h.List)
	g.Get("/:id", readMW, h.Get)
	g.Post("/", writeMW, h.Create)
	g.Put("/:id", writeMW, h.Update)
	g.Delete("/:id", writeMW, h.Delete)
}
