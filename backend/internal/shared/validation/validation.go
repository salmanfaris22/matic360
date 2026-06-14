package validation

import (
	"github.com/go-playground/validator/v10"
	"github.com/gofiber/fiber/v2"
)

var validate = validator.New()

// FieldError is a single field-level validation failure.
type FieldError struct {
	Field string `json:"field"`
	Rule  string `json:"rule"`
}

// BindAndValidate parses the JSON body into out and runs struct validation.
// On failure it returns (false) after writing a 400 with field errors.
func BindAndValidate(c *fiber.Ctx, out any) bool {
	if err := c.BodyParser(out); err != nil {
		_ = c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "invalid request body",
		})
		return false
	}
	if err := validate.Struct(out); err != nil {
		_ = c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "validation failed",
			"error":   toFieldErrors(err),
		})
		return false
	}
	return true
}

func toFieldErrors(err error) []FieldError {
	var out []FieldError
	if ve, ok := err.(validator.ValidationErrors); ok {
		for _, fe := range ve {
			out = append(out, FieldError{Field: fe.Field(), Rule: fe.Tag()})
		}
	}
	return out
}
