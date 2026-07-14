package middleware

import (
	"context"
	"net"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/blue-nest-montessori/api/internal/models"
	"github.com/blue-nest-montessori/api/pkg/response"
)

const KioskSessionKey contextKey = "kioskSession"

// KioskAuthenticator validates a device token and returns its session. Wired to
// KioskService.Authenticate at route-registration time (keeps middleware free of
// a service dependency).
type KioskAuthenticator func(ctx context.Context, token string) (*models.KioskSession, error)

// KioskAuth gates the isolated /kiosk API. The tablet presents its device token
// in the X-Kiosk-Token header; on success the KioskSession (device + branch) is
// put in context. No user JWT, no CMS access.
func KioskAuth(auth KioskAuthenticator) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			token := r.Header.Get("X-Kiosk-Token")
			sess, err := auth(r.Context(), token)
			if err != nil || sess == nil {
				response.Unauthorized(w, "unrecognised device")
				return
			}
			ctx := context.WithValue(r.Context(), KioskSessionKey, sess)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// KioskSession pulls the authenticated device session off the request context.
func KioskSession(r *http.Request) *models.KioskSession {
	s, _ := r.Context().Value(KioskSessionKey).(*models.KioskSession)
	return s
}

// ── simple fixed-window rate limiter ─────────────────────────────────────────

type rateLimiter struct {
	mu     sync.Mutex
	hits   map[string][]time.Time
	limit  int
	window time.Duration
}

// RateLimit allows up to `limit` requests per `window` per client IP. In-memory
// and best-effort — enough to blunt a stuck/abusive kiosk without extra infra.
func RateLimit(limit int, window time.Duration) func(http.Handler) http.Handler {
	rl := &rateLimiter{hits: map[string][]time.Time{}, limit: limit, window: window}
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if !rl.allow(clientIP(r)) {
				response.TooManyRequests(w, "too many requests — slow down")
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

func (rl *rateLimiter) allow(key string) bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()
	now := time.Now()
	cutoff := now.Add(-rl.window)
	kept := rl.hits[key][:0]
	for _, t := range rl.hits[key] {
		if t.After(cutoff) {
			kept = append(kept, t)
		}
	}
	if len(kept) >= rl.limit {
		rl.hits[key] = kept
		return false
	}
	rl.hits[key] = append(kept, now)
	return true
}

// ClientIP extracts the caller IP, honouring X-Forwarded-For behind the proxy.
func ClientIP(r *http.Request) string {
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		return strings.TrimSpace(strings.Split(xff, ",")[0])
	}
	if host, _, err := net.SplitHostPort(r.RemoteAddr); err == nil {
		return host
	}
	return r.RemoteAddr
}

func clientIP(r *http.Request) string { return ClientIP(r) }
