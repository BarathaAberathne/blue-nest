// Package revalidate lets the backend bust the Next.js full-route cache the
// moment public-facing data changes (e.g. a branch flips to coming_soon), so
// the site reflects admin edits immediately instead of after the ISR window.
package revalidate

import (
	"bytes"
	"log/slog"
	"net/http"
	"time"
)

// Notifier posts to the frontend's /api/revalidate route. Best-effort by
// design: a failed call only means the page refreshes on the normal ISR
// schedule instead — it must never block or fail an admin mutation.
type Notifier interface {
	// Site invalidates the whole public layout (used for data rendered on
	// many pages, like the branch roster).
	Site()
}

type httpNotifier struct {
	url    string // e.g. http://frontend:3000
	secret string
	client *http.Client
}

// NewNotifier builds a Notifier; with an empty url or secret it is a no-op
// (the feature is off and pages rely on ISR alone).
func NewNotifier(frontendInternalURL, secret string) Notifier {
	return &httpNotifier{
		url:    frontendInternalURL,
		secret: secret,
		client: &http.Client{Timeout: 5 * time.Second},
	}
}

func (n *httpNotifier) Site() {
	if n.url == "" || n.secret == "" {
		return
	}
	go func() {
		req, err := http.NewRequest(http.MethodPost, n.url+"/api/revalidate",
			bytes.NewBufferString(`{"scope":"layout"}`))
		if err != nil {
			return
		}
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("X-Revalidate-Secret", n.secret)
		resp, err := n.client.Do(req)
		if err != nil {
			slog.Warn("frontend revalidate call failed", "err", err)
			return
		}
		defer resp.Body.Close()
		if resp.StatusCode != http.StatusOK {
			slog.Warn("frontend revalidate rejected", "status", resp.StatusCode)
		}
	}()
}
