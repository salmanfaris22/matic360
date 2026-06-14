package database

import (
	"log"

	"github.com/salman/distribution/internal/models"
	"gorm.io/gorm"
)

// AutoMigrate creates/updates all tables from the GORM model definitions.
func AutoMigrate(db *gorm.DB) error {
	log.Println("⏳ running auto-migration...")
	if err := db.AutoMigrate(models.AllModels()...); err != nil {
		return err
	}
	log.Println("✅ auto-migration complete")
	return nil
}
