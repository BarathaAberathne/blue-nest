package revalidate

import (
	"io"
	"net/http"
	"net/http/httptest"
	"sync"
	"testing"
	"time"
)

func TestSitePostsSecretAndScope(t *testing.T) {
	var mu sync.Mutex
	var gotSecret, gotBody string
	calls := 0
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		mu.Lock()
		defer mu.Unlock()
		calls++
		gotSecret = r.Header.Get("X-Revalidate-Secret")
		b, _ := io.ReadAll(r.Body)
		gotBody = string(b)
		if r.URL.Path != "/api/revalidate" {
			t.Errorf("wrong path %s", r.URL.Path)
		}
		w.WriteHeader(http.StatusOK)
	}))
	defer srv.Close()

	n := NewNotifier(srv.URL, "s3cret")
	n.Site()

	deadline := time.Now().Add(2 * time.Second)
	for {
		mu.Lock()
		done := calls > 0
		mu.Unlock()
		if done || time.Now().After(deadline) {
			break
		}
		time.Sleep(10 * time.Millisecond)
	}
	mu.Lock()
	defer mu.Unlock()
	if calls != 1 {
		t.Fatalf("expected 1 call, got %d", calls)
	}
	if gotSecret != "s3cret" {
		t.Errorf("secret header not sent, got %q", gotSecret)
	}
	if gotBody != `{"scope":"layout"}` {
		t.Errorf("unexpected body %q", gotBody)
	}
}

func TestSiteNoopWithoutSecretOrURL(t *testing.T) {
	calls := 0
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { calls++ }))
	defer srv.Close()

	NewNotifier(srv.URL, "").Site() // no secret
	NewNotifier("", "s").Site()     // no url
	time.Sleep(150 * time.Millisecond)
	if calls != 0 {
		t.Fatalf("no-op notifiers must not call out, got %d calls", calls)
	}
}
