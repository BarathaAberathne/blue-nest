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
	Sourcing    SourcingConfig
	FrontendURL string
	// NotifyEmailEnabled turns on email delivery of in-app notifications
	// (NOTIFY_EMAIL_ENABLED). Opt-in (default off) so dev/test never sends real
	// mail via the configured SMTP; prod sets it true.
	NotifyEmailEnabled bool
	// GBPIngestSecret gates the GBP digest webhook (X-GBP-Secret header). The
	// Claude GBP-monitoring automation posts with this shared secret.
	GBPIngestSecret string
}

// SourcingConfig drives the order-creation tool: per-supplier default order
// recipients and the live-search feature flags.
type SourcingConfig struct {
	GompelsOrderEmail     string
	OtherOrderEmail       string
	GompelsSearchEnabled  bool
	GompelsSearchURL      string
	AmazonBusinessEnabled bool
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
	SecretKey      string
	WebhookSecret  string
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
	// OrderAdminTo / OrderBATo are the store-order notification recipients
	// (comma-separated). They fall back to AdminTo when unset so existing
	// deployments keep working. Branch-manager recipients are resolved per order
	// from the branch record's contact email (not configured here).
	OrderAdminTo string
	OrderBATo    string
	// ResendAPIKey, when set, makes the mailer send via Resend's HTTPS API
	// instead of SMTP. Useful on hosts (e.g. DigitalOcean droplets) that
	// block outbound SMTP by default.
	ResendAPIKey string
}

// normalizeOrigins splits a comma-separated FRONTEND_URL into trimmed origins,
// prepending https:// to any entry missing a scheme. Always returns at least
// one entry; the first is treated as the canonical site URL.
func normalizeOrigins(raw string) []string {
	out := make([]string, 0)
	for _, p := range strings.Split(raw, ",") {
		p = strings.TrimSpace(p)
		if p == "" {
			continue
		}
		if !strings.HasPrefix(p, "http://") && !strings.HasPrefix(p, "https://") {
			p = "https://" + p
		}
		out = append(out, p)
	}
	if len(out) == 0 {
		out = append(out, "http://localhost:3000")
	}
	return out
}

func Load() *Config {
	loadDotenv()

	jwtHours, _ := strconv.Atoi(getEnv("JWT_EXPIRY_HOURS", "24"))
	jwtRefreshDays, _ := strconv.Atoi(getEnv("JWT_REFRESH_EXPIRY_DAYS", "30"))

	// FRONTEND_URL may be a comma-separated list (for CORS). The first normalized
	// origin is the canonical site URL used for OAuth post-login redirects.
	frontendOrigins := normalizeOrigins(getEnv("FRONTEND_URL", "http://localhost:3000"))

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
			AllowedOrigins: frontendOrigins,
		},
		FrontendURL:        frontendOrigins[0],
		NotifyEmailEnabled: strings.EqualFold(getEnv("NOTIFY_EMAIL_ENABLED", "false"), "true"),
		GBPIngestSecret:    getEnv("GBP_INGEST_SECRET", ""),
		SMTP: SMTPConfig{
			Host:         getEnv("SMTP_HOST", ""),
			Port:         func() int { p, _ := strconv.Atoi(getEnv("SMTP_PORT", "587")); return p }(),
			User:         getEnv("SMTP_USER", ""),
			Pass:         getEnv("SMTP_PASS", ""),
			From:         getEnv("SMTP_FROM", "noreply@bluenest.uk"),
			AdminTo:      getEnv("SMTP_ADMIN_TO", "ba@bluenest.com"),
			OrderAdminTo: getEnv("ORDER_ADMIN_EMAILS", getEnv("SMTP_ADMIN_TO", "ba@bluenest.com")),
			OrderBATo:    getEnv("ORDER_BA_EMAILS", ""),
			ResendAPIKey: getEnv("RESEND_API_KEY", ""),
		},
		Sourcing: SourcingConfig{
			GompelsOrderEmail:     getEnv("GOMPELS_ORDER_EMAIL", ""),
			OtherOrderEmail:       getEnv("SUPPLIES_ORDER_EMAIL", ""),
			GompelsSearchEnabled:  strings.EqualFold(getEnv("GOMPELS_SEARCH_ENABLED", "false"), "true"),
			GompelsSearchURL:      getEnv("GOMPELS_SEARCH_URL", ""),
			AmazonBusinessEnabled: strings.EqualFold(getEnv("AMAZON_BUSINESS_ENABLED", "false"), "true"),
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
