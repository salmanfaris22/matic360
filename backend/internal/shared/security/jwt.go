package security

import (
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// TokenType distinguishes access vs refresh tokens.
type TokenType string

const (
	AccessToken  TokenType = "access"
	RefreshToken TokenType = "refresh"
)

// Claims is the JWT payload carried in both token types.
type Claims struct {
	UserID   uint      `json:"uid"`
	RoleSlug string    `json:"role"`
	Type     TokenType `json:"typ"`
	jwt.RegisteredClaims
}

// TokenManager issues and validates access/refresh tokens.
type TokenManager struct {
	accessSecret  []byte
	refreshSecret []byte
	accessTTL     time.Duration
	refreshTTL    time.Duration
}

func NewTokenManager(accessSecret, refreshSecret string, accessTTL, refreshTTL time.Duration) *TokenManager {
	return &TokenManager{
		accessSecret:  []byte(accessSecret),
		refreshSecret: []byte(refreshSecret),
		accessTTL:     accessTTL,
		refreshTTL:    refreshTTL,
	}
}

// TokenPair bundles a freshly issued access + refresh token.
type TokenPair struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	ExpiresIn    int64  `json:"expires_in"` // access token TTL in seconds
}

// Generate issues a new access + refresh token pair for a user.
func (m *TokenManager) Generate(userID uint, roleSlug string) (*TokenPair, error) {
	access, err := m.sign(userID, roleSlug, AccessToken, m.accessSecret, m.accessTTL)
	if err != nil {
		return nil, err
	}
	refresh, err := m.sign(userID, roleSlug, RefreshToken, m.refreshSecret, m.refreshTTL)
	if err != nil {
		return nil, err
	}
	return &TokenPair{
		AccessToken:  access,
		RefreshToken: refresh,
		ExpiresIn:    int64(m.accessTTL.Seconds()),
	}, nil
}

func (m *TokenManager) sign(userID uint, roleSlug string, typ TokenType, secret []byte, ttl time.Duration) (string, error) {
	now := time.Now()
	claims := Claims{
		UserID:   userID,
		RoleSlug: roleSlug,
		Type:     typ,
		RegisteredClaims: jwt.RegisteredClaims{
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(ttl)),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(secret)
}

// ParseAccess validates an access token and returns its claims.
func (m *TokenManager) ParseAccess(tokenStr string) (*Claims, error) {
	return m.parse(tokenStr, AccessToken, m.accessSecret)
}

// ParseRefresh validates a refresh token and returns its claims.
func (m *TokenManager) ParseRefresh(tokenStr string) (*Claims, error) {
	return m.parse(tokenStr, RefreshToken, m.refreshSecret)
}

func (m *TokenManager) parse(tokenStr string, expected TokenType, secret []byte) (*Claims, error) {
	claims := &Claims{}
	token, err := jwt.ParseWithClaims(tokenStr, claims, func(t *jwt.Token) (any, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return secret, nil
	})
	if err != nil {
		return nil, err
	}
	if !token.Valid {
		return nil, errors.New("invalid token")
	}
	if claims.Type != expected {
		return nil, errors.New("unexpected token type")
	}
	return claims, nil
}
