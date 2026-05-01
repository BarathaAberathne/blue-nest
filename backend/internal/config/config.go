package config

import (
	"log"
	"os"
	"strconv"
	"time"

	"github.com/joho/godotenv"
)

type Config struct {
	App    AppConfig
	Mongo  MongoConfig
	JWT    JWTConfig
	Stripe StripeConfig
	CORS   CORSConfig
	SMTP   SMTPConfig
}

type AppConfig struct {
	Env    string
	Port   string
	Secret string
}

type MongoConfig struct {
	URI      string
	Database string
}

type JWTConfig struct {
	Secret            string
	ExpiryHours       time.Duration
	RefreshExpiryDays time.Duration
}

type StripeConfig struct {
	SecretKey     string
	WebhookSecret string
	PublishableKey string
}

type CORSConfig struct {
	FrontendURL string
}

type SMTPConfig struct {
	Host    string
	Port    int
	User    string
	Pass    string
	From    string
	AdminTo string
}

func Load() *Config {
	if err := godotenv.Load(); err != nil {
		log.Println("no .env file found, reading from environment")
	}

	jwtHours, _ := strconv.Atoi(getEnv("JWT_EXPIRY_HOURS", "24"))
	jwtRefreshDays, _ := strconv.Atoi(getEnv("JWT_REFRESH_EXPIRY_DAYS", "30"))

	return &Config{
		App: AppConfig{
			Env:    getEnv("APP_ENV", "development"),
			Port:   getEnv("APP_PORT", "8080"),
			Secret: getEnv("APP_SECRET", "change-me"),
		},
		Mongo: MongoConfig{
			URI:      getEnv("MONGODB_URI", "mongodb://localhost:27017"),
			Database: getEnv("MONGODB_DATABASE", "blue_nest_montessori"),
		},
		JWT: JWTConfig{
			Secret:            getEnv("JWT_SECRET", "change-me-jwt"),
			ExpiryHours:       time.Duration(jwtHours) * time.Hour,
			RefreshExpiryDays: time.Duration(jwtRefreshDays) * 24 * time.Hour,
		},
		Stripe: StripeConfig{
			SecretKey:      getEnv("STRIPE_SECRET_KEY", ""),
			WebhookSecret:  getEnv("STRIPE_WEBHOOK_SECRET", ""),
			PublishableKey: getEnv("STRIPE_PUBLISHABLE_KEY", ""),
		},
		CORS: CORSConfig{
			FrontendURL: getEnv("FRONTEND_URL", "http://localhost:3000"),
		},
		SMTP: SMTPConfig{
			Host:    getEnv("SMTP_HOST", ""),
			Port:    func() int { p, _ := strconv.Atoi(getEnv("SMTP_PORT", "587")); return p }(),
			User:    getEnv("SMTP_USER", ""),
			Pass:    getEnv("SMTP_PASS", ""),
			From:    getEnv("SMTP_FROM", "noreply@bluenest.uk"),
			AdminTo: getEnv("SMTP_ADMIN_TO", "ba@bluenest.com"),
		},
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
