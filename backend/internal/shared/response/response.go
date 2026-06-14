package response

import "github.com/gofiber/fiber/v2"

// Envelope is the standard JSON response shape for the whole API.
type Envelope struct {
	Success bool   `json:"success"`
	Message string `json:"message,omitempty"`
	Data    any    `json:"data,omitempty"`
	Meta    any    `json:"meta,omitempty"`
	Error   any    `json:"error,omitempty"`
}

// OK returns 200 with data.
func OK(c *fiber.Ctx, data any) error {
	return c.Status(fiber.StatusOK).JSON(Envelope{Success: true, Data: data})
}

// OKMessage returns 200 with a message and optional data.
func OKMessage(c *fiber.Ctx, message string, data any) error {
	return c.Status(fiber.StatusOK).JSON(Envelope{Success: true, Message: message, Data: data})
}

// Created returns 201 with data.
func Created(c *fiber.Ctx, data any) error {
	return c.Status(fiber.StatusCreated).JSON(Envelope{Success: true, Data: data})
}

// Paginated returns 200 with data plus pagination metadata.
func Paginated(c *fiber.Ctx, data any, meta any) error {
	return c.Status(fiber.StatusOK).JSON(Envelope{Success: true, Data: data, Meta: meta})
}

// Error returns an error envelope with the given status code.
func Error(c *fiber.Ctx, status int, message string, details ...any) error {
	env := Envelope{Success: false, Message: message}
	if len(details) > 0 {
		env.Error = details[0]
	}
	return c.Status(status).JSON(env)
}

func BadRequest(c *fiber.Ctx, message string, details ...any) error {
	return Error(c, fiber.StatusBadRequest, message, details...)
}

func Unauthorized(c *fiber.Ctx, message string) error {
	return Error(c, fiber.StatusUnauthorized, message)
}

func Forbidden(c *fiber.Ctx, message string) error {
	return Error(c, fiber.StatusForbidden, message)
}

func NotFound(c *fiber.Ctx, message string) error {
	return Error(c, fiber.StatusNotFound, message)
}

func Internal(c *fiber.Ctx, message string) error {
	return Error(c, fiber.StatusInternalServerError, message)
}

func Conflict(c *fiber.Ctx, message string) error {
	return Error(c, fiber.StatusConflict, message)
}
