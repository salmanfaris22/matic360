package middleware

import (
	"encoding/json"

	"github.com/gofiber/fiber/v2"
	"github.com/salman/distribution/internal/models"
	"github.com/salman/distribution/internal/shared/response"
)

// RequireRole allows the request only if the user's role slug is in allowed.
// Must run after Auth.
func RequireRole(allowed ...string) fiber.Handler {
	allowSet := make(map[string]struct{}, len(allowed))
	for _, r := range allowed {
		allowSet[r] = struct{}{}
	}
	return func(c *fiber.Ctx) error {
		user := CurrentUser(c)
		if user == nil || user.Role == nil {
			return response.Unauthorized(c, "authentication required")
		}
		if _, ok := allowSet[user.Role.Slug]; !ok {
			return response.Forbidden(c, "insufficient role")
		}
		return c.Next()
	}
}

// RequirePermission allows the request only if the user's role grants the
// permission key (super admin's "*" wildcard always passes). Must run after Auth.
func RequirePermission(permission string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		user := CurrentUser(c)
		if user == nil || user.Role == nil {
			return response.Unauthorized(c, "authentication required")
		}
		if user.Role.Slug == models.RoleSuperAdmin || HasPermission(user.Role, permission) {
			return c.Next()
		}
		return response.Forbidden(c, "missing permission: "+permission)
	}
}

// HasPermission reports whether a role's permission list contains the key or "*".
func HasPermission(role *models.Role, permission string) bool {
	if role == nil {
		return false
	}
	var perms []string
	if len(role.Permissions) > 0 {
		_ = json.Unmarshal(role.Permissions, &perms)
	}
	for _, p := range perms {
		if p == "*" || p == permission {
			return true
		}
	}
	return false
}
