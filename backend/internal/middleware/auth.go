package middleware

import (
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/salman/distribution/internal/models"
	"github.com/salman/distribution/internal/shared/response"
	"github.com/salman/distribution/internal/shared/security"
	"gorm.io/gorm"
)

// Context local keys.
const (
	LocalUser     = "user"
	LocalUserID   = "user_id"
	LocalRoleSlug = "role_slug"
)

// Auth validates the Bearer access token and loads the current user (with role)
// into the request context.
func Auth(tm *security.TokenManager, db *gorm.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		header := c.Get("Authorization")
		if header == "" || !strings.HasPrefix(header, "Bearer ") {
			return response.Unauthorized(c, "missing or malformed authorization header")
		}
		tokenStr := strings.TrimPrefix(header, "Bearer ")

		claims, err := tm.ParseAccess(tokenStr)
		if err != nil {
			return response.Unauthorized(c, "invalid or expired token")
		}

		var user models.User
		if err := db.Preload("Role").Preload("Branch").First(&user, claims.UserID).Error; err != nil {
			return response.Unauthorized(c, "user no longer exists")
		}
		if !user.IsActive {
			return response.Forbidden(c, "account is disabled")
		}

		c.Locals(LocalUser, &user)
		c.Locals(LocalUserID, user.ID)
		if user.Role != nil {
			c.Locals(LocalRoleSlug, user.Role.Slug)
		}
		return c.Next()
	}
}

// CurrentUser returns the authenticated user from context, or nil.
func CurrentUser(c *fiber.Ctx) *models.User {
	if u, ok := c.Locals(LocalUser).(*models.User); ok {
		return u
	}
	return nil
}

// CurrentUserID returns the authenticated user's id (0 if absent).
func CurrentUserID(c *fiber.Ctx) uint {
	if id, ok := c.Locals(LocalUserID).(uint); ok {
		return id
	}
	return 0
}
