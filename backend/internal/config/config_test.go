package config

import (
	"strings"
	"testing"
)

// Regression lock: production boot must refuse placeholder secrets and the
// dev-localhost Mongo fallback (audit finding — the container previously
// booted looking healthy on "change-me-jwt").

func prodConfig() *Config {
	return &Config{
		App:   AppConfig{Env: "production", Secret: "a-real-32-char-secret-value-here"},
		JWT:   JWTConfig{Secret: "a-real-64-char-jwt-secret-value"},
		Mongo: MongoConfig{URI: "mongodb://app:pw@mongodb:27017/blue_nest?authSource=blue_nest"},
	}
}

func TestValidateAcceptsRealProductionConfig(t *testing.T) {
	if err := prodConfig().Validate(); err != nil {
		t.Fatalf("valid production config rejected: %v", err)
	}
}

func TestValidateRefusesPlaceholdersInProduction(t *testing.T) {
	cases := []struct {
		name   string
		mutate func(*Config)
		want   string
	}{
		{"default app secret", func(c *Config) { c.App.Secret = "change-me" }, "APP_SECRET"},
		{"empty app secret", func(c *Config) { c.App.Secret = "" }, "APP_SECRET"},
		{"default jwt secret", func(c *Config) { c.JWT.Secret = "change-me-jwt" }, "JWT_SECRET"},
		{"empty jwt secret", func(c *Config) { c.JWT.Secret = "" }, "JWT_SECRET"},
		{"localhost mongo fallback", func(c *Config) { c.Mongo.URI = "mongodb://localhost:27017" }, "MONGODB_URI"},
		{"empty mongo uri", func(c *Config) { c.Mongo.URI = "" }, "MONGODB_URI"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			c := prodConfig()
			tc.mutate(c)
			err := c.Validate()
			if err == nil {
				t.Fatal("expected production validation to fail, got nil")
			}
			if !strings.Contains(err.Error(), tc.want) {
				t.Fatalf("error %q does not name the offending key %q", err.Error(), tc.want)
			}
		})
	}
}

func TestValidateIgnoresNonProduction(t *testing.T) {
	c := &Config{App: AppConfig{Env: "development", Secret: "change-me"}, JWT: JWTConfig{Secret: "change-me-jwt"}}
	if err := c.Validate(); err != nil {
		t.Fatalf("dev config must not be validated: %v", err)
	}
}
