package database

import (
	"fmt"
	"log"
	"time"

	"github.com/salman/distribution/internal/config"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// Connect opens a pooled GORM connection to PostgreSQL, creating the target
// database first if it does not yet exist.
func Connect(cfg *config.Config) (*gorm.DB, error) {
	logLevel := logger.Info
	if cfg.IsProduction() {
		logLevel = logger.Error
	}

	// Best-effort: create the database if missing so a fresh checkout just runs.
	if err := ensureDatabaseExists(cfg); err != nil {
		log.Printf("⚠️  could not auto-create database (continuing): %v", err)
	}

	db, err := gorm.Open(postgres.Open(cfg.DB.DSN()), &gorm.Config{
		Logger: logger.Default.LogMode(logLevel),
	})
	if err != nil {
		return nil, err
	}

	sqlDB, err := db.DB()
	if err != nil {
		return nil, err
	}
	sqlDB.SetMaxOpenConns(25)
	sqlDB.SetMaxIdleConns(10)
	sqlDB.SetConnMaxLifetime(time.Hour)

	log.Println("✅ database connected")
	return db, nil
}

// ensureDatabaseExists connects to the maintenance `postgres` database and
// creates the target database if it is not present. Requires the configured
// user to have the CREATEDB privilege (the default `postgres` superuser does).
func ensureDatabaseExists(cfg *config.Config) error {
	adminDSN := fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=postgres sslmode=%s TimeZone=%s",
		cfg.DB.Host, cfg.DB.Port, cfg.DB.User, cfg.DB.Password, cfg.DB.SSLMode, cfg.DB.TimeZone,
	)
	admin, err := gorm.Open(postgres.Open(adminDSN), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	if err != nil {
		return err
	}
	sqlDB, err := admin.DB()
	if err != nil {
		return err
	}
	defer sqlDB.Close()

	var exists bool
	if err := admin.Raw(
		"SELECT EXISTS(SELECT 1 FROM pg_database WHERE datname = ?)", cfg.DB.Name,
	).Scan(&exists).Error; err != nil {
		return err
	}
	if exists {
		return nil
	}
	// DB name is operator-controlled config, not user input; quote defensively.
	if err := admin.Exec(fmt.Sprintf(`CREATE DATABASE "%s"`, cfg.DB.Name)).Error; err != nil {
		return err
	}
	log.Printf("🆕 created database %q", cfg.DB.Name)
	return nil
}
