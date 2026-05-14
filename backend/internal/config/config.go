package config

import (
	"log"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/joho/godotenv"
)

type Config struct {
	App         AppConfig
	Mongo       MongoConfig
	JWT         JWTConfig
	Stripe      StripeConfig
	CORS        CORSConfig
	SMTP        SMTPConfig
	Google      OAuthProviderConfig
	Facebook    OAuthProviderConfig
	FrontendURL string
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
	AllowedOrigins []string
}

type SMTPConfig struct {
	Host    string
	Port    int
	User    string
	Pass    string
	From    string
	AdminTo string
}

type OAuthProviderConfig struct {
	ClientID     string
	ClientSecret string
	RedirectURL  string
}

func Load() *Config {
	loadDotenv()

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
			AllowedOrigins: strings.Split(getEnv("FRONTEND_URL", "http://localhost:3000"), ","),
		},
		Google: OAuthProviderConfig{
			ClientID:     getEnv("GOOGLE_CLIENT_ID", ""),
			ClientSecret: getEnv("GOOGLE_CLIENT_SECRET", ""),
			RedirectURL:  getEnv("GOOGLE_REDIRECT_URL", "http://localhost:8080/api/v1/auth/google/callback"),
		},
		Facebook: OAuthProviderConfig{
			ClientID:     getEnv("FACEBOOK_CLIENT_ID", ""),
			ClientSecret: getEnv("FACEBOOK_CLIENT_SECRET", ""),
			RedirectURL:  getEnv("FACEBOOK_REDIRECT_URL", "http://localhost:8080/api/v1/auth/facebook/callback"),
		},
		FrontendURL: getEnv("FRONTEND_URL", "http://localhost:3000"),
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

// loadDotenv tries common .env locations: the current working directory first,
// then walks up to four parent levels. This makes `go run ./cmd/seedusers`
// (which leaves cwd at backend/) and other `cd backend && go run …` patterns
// pick up the project-root .env. Inside Docker the file never exists; env vars
// are already injected via env_file in docker-compose, so all paths miss and
// we fall back silently to os.Getenv.
func loadDotenv() {
	candidates := []string{".env", "../.env", "../../.env", "../../../.env"}
	for _, path := range candidates {
		if err := godotenv.Load(path); err == nil {
			log.Printf("loaded env from %s", path)
			return
		}
	}
	log.Println("no .env file found, reading from environment")
}
