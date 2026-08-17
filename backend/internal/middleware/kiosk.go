package middleware

import (
	"context"
	"net"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/blue-nest-montessori/api/internal/models"
	"github.com/blue-nest-montessori/api/internal/repository"
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
			// Re-pin the request to the DEVICE's organisation: the kiosk routes
			// are unauthenticated (default-tenant), but the device token proves
			// which tenant this tablet belongs to.
			if sess.OrgID != "" {
				ctx = repository.WithOrg(ctx, sess.OrgID)
			}
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
	// lastSweep drives the periodic map GC: per-key timestamp pruning alone
	// never deletes the KEYS, so a scan across many source IPs (or spoofed
	// ones) grew the map unboundedly for the process lifetime.
	lastSweep time.Time
}

// sweep (caller must hold mu) drops keys whose every timestamp has aged out.
// Runs at most once per 2×window so steady-state cost stays negligible.
func (rl *rateLimiter) sweep(now time.Time) {
	if now.Sub(rl.lastSweep) < 2*rl.window {
		return
	}
	rl.lastSweep = now
	cutoff := now.Add(-rl.window)
	for key, times := range rl.hits {
		alive := false
		for _, t := range times {
			if t.After(cutoff) {
				alive = true
				break
			}
		}
		if !alive {
			delete(rl.hits, key)
		}
	}
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

// RateLimitFailures allows up to `limit` FAILED attempts (HTTP 401) per window
// per client IP; successful requests never consume budget. Built for the login
// routes: a credential-guessing script still hits the wall after `limit` wrong
// passwords, but legitimate sign-ins — including many users behind one NAT, or
// a full e2e test run's dozens of successful suite logins — are never locked
// out by each other. (The old plain RateLimit counted successes too, which
// throttled real users and made every full test run end in a 429 tail.)
func RateLimitFailures(limit int, window time.Duration) func(http.Handler) http.Handler {
	rl := &rateLimiter{hits: map[string][]time.Time{}, limit: limit, window: window}
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			key := clientIP(r)
			if rl.overLimit(key) {
				response.TooManyRequests(w, "too many failed attempts — slow down")
				return
			}
			rec := &statusRecorder{ResponseWriter: w, status: http.StatusOK}
			next.ServeHTTP(rec, r)
			if rec.status == http.StatusUnauthorized {
				rl.record(key)
			}
		})
	}
}

// statusRecorder captures the response status so the failure limiter knows
// whether the attempt should consume budget.
type statusRecorder struct {
	http.ResponseWriter
	status int
}

func (s *statusRecorder) WriteHeader(code int) {
	s.status = code
	s.ResponseWriter.WriteHeader(code)
}

// overLimit reports whether the key has exhausted its failure budget (read-only).
func (rl *rateLimiter) overLimit(key string) bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()
	cutoff := time.Now().Add(-rl.window)
	n := 0
	for _, t := range rl.hits[key] {
		if t.After(cutoff) {
			n++
		}
	}
	return n >= rl.limit
}

// record counts one failed attempt against the key.
func (rl *rateLimiter) record(key string) {
	rl.mu.Lock()
	defer rl.mu.Unlock()
	now := time.Now()
	rl.sweep(now)
	cutoff := now.Add(-rl.window)
	kept := rl.hits[key][:0]
	for _, t := range rl.hits[key] {
		if t.After(cutoff) {
			kept = append(kept, t)
		}
	}
	rl.hits[key] = append(kept, now)
}

func (rl *rateLimiter) allow(key string) bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()
	now := time.Now()
	rl.sweep(now)
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

// ClientIP extracts the caller IP. Proxy headers are honoured ONLY when the
// direct peer is a trusted proxy (loopback / private-range — nginx on the
// droplet reaches the container over the docker bridge). A client-supplied
// X-Forwarded-For from an untrusted peer is ignored, and even behind the
// proxy we prefer X-Real-IP (which our nginx OVERWRITES with $remote_addr,
// so it cannot be spoofed through it) and otherwise take the RIGHTMOST
// X-Forwarded-For entry — the one our proxy appended — never the leftmost,
// which the client controls. Before this, one spoofed header per request
// defeated the login rate limiter entirely.
func ClientIP(r *http.Request) string {
	peer := r.RemoteAddr
	if host, _, err := net.SplitHostPort(r.RemoteAddr); err == nil {
		peer = host
	}
	if !trustedProxy(peer) {
		return peer
	}
	if rip := strings.TrimSpace(r.Header.Get("X-Real-IP")); rip != "" {
		return rip
	}
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		parts := strings.Split(xff, ",")
		return strings.TrimSpace(parts[len(parts)-1])
	}
	return peer
}

// trustedProxy reports whether the direct peer is our own reverse proxy:
// loopback or a private address (nginx reaches the backend container over
// 127.0.0.1 port-forwarding / the docker bridge network).
func trustedProxy(ip string) bool {
	parsed := net.ParseIP(ip)
	if parsed == nil {
		return false
	}
	return parsed.IsLoopback() || parsed.IsPrivate()
}

func clientIP(r *http.Request) string { return ClientIP(r) }
