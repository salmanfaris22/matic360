package server

import (
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"gorm.io/gorm"

	"github.com/salman/distribution/internal/config"
	mw "github.com/salman/distribution/internal/middleware"
	"github.com/salman/distribution/internal/modules/attendance"
	"github.com/salman/distribution/internal/modules/auth"
	"github.com/salman/distribution/internal/modules/branch"
	"github.com/salman/distribution/internal/modules/customer"
	"github.com/salman/distribution/internal/modules/damage"
	"github.com/salman/distribution/internal/modules/dashboard"
	"github.com/salman/distribution/internal/modules/department"
	"github.com/salman/distribution/internal/modules/expense"
	"github.com/salman/distribution/internal/modules/newarrival"
	"github.com/salman/distribution/internal/modules/notification"
	"github.com/salman/distribution/internal/modules/outstanding"
	"github.com/salman/distribution/internal/modules/payment"
	"github.com/salman/distribution/internal/modules/pickup"
	"github.com/salman/distribution/internal/modules/product"
	"github.com/salman/distribution/internal/modules/role"
	"github.com/salman/distribution/internal/modules/salary"
	"github.com/salman/distribution/internal/modules/staff"
	"github.com/salman/distribution/internal/modules/user"
	"github.com/salman/distribution/internal/shared/response"
	"github.com/salman/distribution/internal/shared/security"
	"github.com/salman/distribution/internal/shared/storage"
)

// New builds the configured Fiber application with all routes mounted.
func New(cfg *config.Config, db *gorm.DB, tm *security.TokenManager, store storage.Storage) *fiber.App {
	app := fiber.New(fiber.Config{
		AppName:               cfg.AppName,
		BodyLimit:             20 * 1024 * 1024, // 20MB for image uploads
		DisableStartupMessage: cfg.IsProduction(),
		ErrorHandler: func(c *fiber.Ctx, err error) error {
			code := fiber.StatusInternalServerError
			if e, ok := err.(*fiber.Error); ok {
				code = e.Code
			}
			return response.Error(c, code, err.Error())
		},
	})

	app.Use(recover.New())
	app.Use(logger.New())
	app.Use(cors.New(cors.Config{
		AllowOrigins:     joinOrigins(cfg.CORSOrigins),
		AllowMethods:     "GET,POST,PUT,PATCH,DELETE,OPTIONS",
		AllowHeaders:     "Origin,Content-Type,Accept,Authorization",
		AllowCredentials: true,
	}))

	// Serve uploaded files (local storage driver).
	app.Static("/uploads", cfg.Storage.LocalDir)

	// Health check.
	app.Get("/health", func(c *fiber.Ctx) error {
		return response.OK(c, fiber.Map{"status": "ok", "app": cfg.AppName})
	})

	// ── API v1 ──────────────────────────────────────────
	api := app.Group("/api/v1")
	protected := mw.Auth(tm, db)

	// Auth (public + /me protected).
	auth.RegisterRoutes(api, auth.NewHandler(auth.NewService(db, tm)), protected)

	// Everything below requires authentication.
	secured := api.Group("", protected)
	dashboard.RegisterRoutes(secured, dashboard.NewHandler(db))
	user.RegisterRoutes(secured, user.NewHandler(db))
	role.RegisterRoutes(secured, role.NewHandler(db))
	department.RegisterRoutes(secured, department.NewHandler(db))
	branch.RegisterRoutes(secured, branch.NewHandler(db))

	staffRepo := staff.NewRepository(db)
	staffSvc := staff.NewService(staffRepo, store)
	staff.RegisterRoutes(secured, staff.NewHandler(staffSvc, store))

	// Attendance (staff self-service + admin review) + auto-close worker.
	attendanceSvc := attendance.NewService(db)
	attendance.StartAutoCloseWorker(attendanceSvc)
	attendance.RegisterRoutes(secured, attendance.NewHandler(attendanceSvc, store))

	// Operations & inventory modules.
	customer.RegisterRoutes(secured, db)
	outstanding.RegisterRoutes(secured, db)
	payment.RegisterRoutes(secured, db, store)
	expense.RegisterRoutes(secured, db, store)
	salary.RegisterRoutes(secured, db)
	pickup.RegisterRoutes(secured, db)
	product.RegisterRoutes(secured, db)
	newarrival.RegisterRoutes(secured, db)
	damage.RegisterRoutes(secured, db)
	notification.RegisterRoutes(secured, db)

	// Fallback 404 for unknown API routes.
	app.Use(func(c *fiber.Ctx) error {
		return response.NotFound(c, "route not found")
	})

	return app
}

func joinOrigins(origins []string) string {
	out := ""
	for i, o := range origins {
		if i > 0 {
			out += ","
		}
		out += o
	}
	if out == "" {
		return "*"
	}
	return out
}
