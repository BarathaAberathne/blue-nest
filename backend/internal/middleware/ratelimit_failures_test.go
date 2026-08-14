package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

// TestRateLimitFailures locks the failure-only semantics: successful logins
// never consume budget (a full e2e run's dozens of suite logins must not lock
// each other out), while wrong-password attempts hit the wall after `limit`.
func TestRateLimitFailures(t *testing.T) {
	limit := 3
	mw := RateLimitFailures(limit, time.Minute)

	newHandler := func(status int) http.Handler {
		return mw(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(status)
		}))
	}
	call := func(h http.Handler) int {
		req := httptest.NewRequest(http.MethodPost, "/auth/login", nil)
		req.RemoteAddr = "203.0.113.7:1234"
		rec := httptest.NewRecorder()
		h.ServeHTTP(rec, req)
		return rec.Code
	}

	// Unlimited successes: far more than `limit`, never throttled.
	ok := newHandler(http.StatusOK)
	for i := 0; i < limit*10; i++ {
		if got := call(ok); got != http.StatusOK {
			t.Fatalf("success %d throttled: got %d", i+1, got)
		}
	}

	// Failures consume budget; the attempt AFTER the limit is rejected 429.
	bad := newHandler(http.StatusUnauthorized)
	for i := 0; i < limit; i++ {
		if got := call(bad); got != http.StatusUnauthorized {
			t.Fatalf("failure %d: got %d, want 401", i+1, got)
		}
	}
	if got := call(bad); got != http.StatusTooManyRequests {
		t.Fatalf("attempt past the failure limit: got %d, want 429", got)
	}
	// Once over the failure budget, even a would-be-successful login is
	// blocked for the window — the guesser can't keep probing.
	if got := call(ok); got != http.StatusTooManyRequests {
		t.Fatalf("success after exhausted failure budget: got %d, want 429", got)
	}

	// A different IP is unaffected.
	req := httptest.NewRequest(http.MethodPost, "/auth/login", nil)
	req.RemoteAddr = "198.51.100.9:4321"
	rec := httptest.NewRecorder()
	ok.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("other IP throttled: got %d", rec.Code)
	}
}
