package main

import (
	"log"

	"github.com/salman/distribution/internal/config"
	"github.com/salman/distribution/internal/database"
	"github.com/salman/distribution/internal/server"
	"github.com/salman/distribution/internal/shared/security"
	"github.com/salman/distribution/internal/shared/storage"
)

func main() {
	cfg := config.Load()

	db, err := database.Connect(cfg)
	if err != nil {
		log.Fatalf("❌ database connection failed: %v", err)
	}

	if err := database.AutoMigrate(db); err != nil {
		log.Fatalf("❌ auto-migration failed: %v", err)
	}

	if err := database.Seed(db, cfg); err != nil {
		log.Fatalf("❌ seeding failed: %v", err)
	}

	store, err := storage.New(cfg)
	if err != nil {
		log.Fatalf("❌ storage init failed: %v", err)
	}

	tm := security.NewTokenManager(
		cfg.JWT.AccessSecret, cfg.JWT.RefreshSecret,
		cfg.JWT.AccessTTL, cfg.JWT.RefreshTTL,
	)

	app := server.New(cfg, db, tm, store)

	addr := ":" + cfg.AppPort
	log.Printf("🚀 %s listening on %s", cfg.AppName, addr)
	if err := app.Listen(addr); err != nil {
		log.Fatalf("❌ server error: %v", err)
	}
}
