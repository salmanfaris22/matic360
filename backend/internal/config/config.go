package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/joho/godotenv"
)

// Config holds all runtime configuration loaded from environment variables.
type Config struct {
	AppEnv      string
	AppName     string
	AppPort     string
	CORSOrigins []string

	DB  DBConfig
	JWT JWTConfig

	Storage StorageConfig
	Seed    SeedConfig
}

type DBConfig struct {
	Host     string
	Port     string
	User     string
	Password string
	Name     string
	SSLMode  string
	TimeZone string
}

type JWTConfig struct {
	AccessSecret  string
	RefreshSecret string
	AccessTTL     time.Duration
	RefreshTTL    time.Duration
}

type StorageConfig struct {
	Driver    string // local | s3
	LocalDir  string
	PublicURL string
	S3Bucket  string
	S3Region  string
	S3Access  string
	S3Secret  string
	S3Endpoint string
}

type SeedConfig struct {
	SuperAdminEmail    string
	SuperAdminPassword string
	SuperAdminName     string
}

// Load reads the .env file (if present) and builds a Config from the environment.
func Load() *Config {
	// .env is optional — real deployments inject env vars directly.
	_ = godotenv.Load()

	cfg := &Config{
		AppEnv:      get("APP_ENV", "development"),
		AppName:     get("APP_NAME", "Distribution Management System"),
		AppPort:     get("APP_PORT", "8080"),
		CORSOrigins: splitCSV(get("CORS_ORIGINS", "http://localhost:5173")),
		DB: DBConfig{
			Host:     get("DB_HOST", "localhost"),
			Port:     get("DB_PORT", "5432"),
			User:     get("DB_USER", "postgres"),
			Password: get("DB_PASSWORD", "postgres"),
			Name:     get("DB_NAME", "distribution"),
			SSLMode:  get("DB_SSLMODE", "disable"),
			TimeZone: get("DB_TIMEZONE", "Asia/Kolkata"),
		},
		JWT: JWTConfig{
			AccessSecret:  get("JWT_ACCESS_SECRET", "dev-access-secret"),
			RefreshSecret: get("JWT_REFRESH_SECRET", "dev-refresh-secret"),
			AccessTTL:     time.Duration(getInt("JWT_ACCESS_TTL_MINUTES", 15)) * time.Minute,
			RefreshTTL:    time.Duration(getInt("JWT_REFRESH_TTL_HOURS", 168)) * time.Hour,
		},
		Storage: StorageConfig{
			Driver:     get("STORAGE_DRIVER", "local"),
			LocalDir:   get("STORAGE_LOCAL_DIR", "./uploads"),
			PublicURL:  get("STORAGE_PUBLIC_URL", "http://localhost:8080/uploads"),
			S3Bucket:   get("S3_BUCKET", ""),
			S3Region:   get("S3_REGION", ""),
			S3Access:   get("S3_ACCESS_KEY", ""),
			S3Secret:   get("S3_SECRET_KEY", ""),
			S3Endpoint: get("S3_ENDPOINT", ""),
		},
		Seed: SeedConfig{
			SuperAdminEmail:    get("SEED_SUPERADMIN_EMAIL", "superadmin@company.com"),
			SuperAdminPassword: get("SEED_SUPERADMIN_PASSWORD", "ChangeMe@123"),
			SuperAdminName:     get("SEED_SUPERADMIN_NAME", "Super Admin"),
		},
	}
	return cfg
}

// DSN builds the PostgreSQL connection string for GORM.
func (d DBConfig) DSN() string {
	return fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=%s TimeZone=%s",
		d.Host, d.Port, d.User, d.Password, d.Name, d.SSLMode, d.TimeZone,
	)
}

func (c *Config) IsProduction() bool { return c.AppEnv == "production" }

func get(key, fallback string) string {
	if v, ok := os.LookupEnv(key); ok && v != "" {
		return v
	}
	return fallback
}

func getInt(key string, fallback int) int {
	if v, ok := os.LookupEnv(key); ok && v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			return n
		}
	}
	return fallback
}

func splitCSV(s string) []string {
	parts := strings.Split(s, ",")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		if t := strings.TrimSpace(p); t != "" {
			out = append(out, t)
		}
	}
	return out
}
