package main

import (
	"context"
	"errors"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/blue-nest-montessori/api/internal/config"
	"github.com/blue-nest-montessori/api/internal/platform/logger"
	stripePlatform "github.com/blue-nest-montessori/api/internal/platform/stripe"
	"github.com/blue-nest-montessori/api/internal/server"
)

func main() {
	cfg := config.Load()
	log := logger.New(cfg.App.Env)

	// Fail fast in production if secrets are still placeholders or Mongo fell
	// back to the dev localhost default — never serve traffic on "change-me-jwt".
	if err := cfg.Validate(); err != nil {
		log.Error("invalid production configuration", "error", err)
		os.Exit(1)
	}

	if cfg.Stripe.SecretKey != "" {
		stripePlatform.Init(cfg.Stripe.SecretKey)
	}

	srv, err := server.New(cfg, log)
	if err != nil {
		log.Error("failed to initialise server", "error", err)
		os.Exit(1)
	}

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		if err := srv.Start(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Error("server error", "error", err)
			os.Exit(1)
		}
	}()

	<-quit

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Error("shutdown error", "error", err)
		os.Exit(1)
	}

	log.Info("server stopped")
}
