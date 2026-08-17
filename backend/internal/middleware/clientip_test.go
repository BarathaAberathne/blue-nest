package middleware

import (
	"fmt"
	"net/http/httptest"
	"testing"
	"time"
)

// Regression locks for the spoofable-rate-limiter finding: ClientIP used to
// take the FIRST X-Forwarded-For entry from ANY peer, so one forged header
// per request gave the sender a fresh identity and the login failure limiter
// never fired.

func TestClientIPIgnoresSpoofedHeadersFromUntrustedPeer(t *testing.T) {
	r := httptest.NewRequest("POST", "/auth/login", nil)
	r.RemoteAddr = "203.0.113.50:44321" // public peer = direct connection
	r.Header.Set("X-Forwarded-For", "10.99.99.1")
	r.Header.Set("X-Real-IP", "10.99.99.2")
	if got := ClientIP(r); got != "203.0.113.50" {
		t.Fatalf("untrusted peer's forged proxy headers must be ignored; got %q", got)
	}
}

func TestClientIPPrefersXRealIPBehindTrustedProxy(t *testing.T) {
	r := httptest.NewRequest("POST", "/auth/login", nil)
	r.RemoteAddr = "172.18.0.1:33000" // docker bridge = our nginx
	// nginx overwrites X-Real-IP with $remote_addr, so it is authoritative
	// even when the client also sent its own X-Forwarded-For.
	r.Header.Set("X-Real-IP", "198.51.100.7")
	r.Header.Set("X-Forwarded-For", "6.6.6.6, 198.51.100.7")
	if got := ClientIP(r); got != "198.51.100.7" {
		t.Fatalf("X-Real-IP from the trusted proxy must win; got %q", got)
	}
}

func TestClientIPTakesRightmostForwardedEntry(t *testing.T) {
	r := httptest.NewRequest("POST", "/auth/login", nil)
	r.RemoteAddr = "127.0.0.1:9000"
	// No X-Real-IP: the rightmost XFF entry is the one OUR proxy appended;
	// the leftmost is client-controlled and must never be used.
	r.Header.Set("X-Forwarded-For", "6.6.6.6, 198.51.100.7")
	if got := ClientIP(r); got != "198.51.100.7" {
		t.Fatalf("rightmost XFF entry must win; got %q", got)
	}
}

func TestClientIPFallsBackToPeerWithoutHeaders(t *testing.T) {
	r := httptest.NewRequest("GET", "/", nil)
	r.RemoteAddr = "127.0.0.1:8080"
	if got := ClientIP(r); got != "127.0.0.1" {
		t.Fatalf("want peer IP fallback, got %q", got)
	}
}

func TestRateLimiterSweepEvictsIdleKeys(t *testing.T) {
	rl := &rateLimiter{hits: map[string][]time.Time{}, limit: 5, window: time.Millisecond}
	for i := 0; i < 100; i++ {
		rl.allow(fmt.Sprintf("198.51.100.%d", i))
	}
	time.Sleep(5 * time.Millisecond)
	// The sweep runs at most once per 2×window; force it via a fresh call.
	rl.allow("trigger")
	rl.mu.Lock()
	n := len(rl.hits)
	rl.mu.Unlock()
	if n > 2 { // "trigger" (+ maybe one racing entry) — the 100 idle keys must be gone
		t.Fatalf("idle limiter keys not evicted: %d keys remain", n)
	}
}
