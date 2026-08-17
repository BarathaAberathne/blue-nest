package routes

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/blue-nest-montessori/api/internal/config"
	"github.com/blue-nest-montessori/api/internal/models"
	"github.com/blue-nest-montessori/api/internal/repository"
	"github.com/blue-nest-montessori/api/internal/service"
	"github.com/go-chi/chi/v5"
)

// Regression lock: the Stripe + GBP webhook routes are registered on the ROOT
// mux (raw-body requirement keeps them outside the /api/v1 group), so they do
// NOT inherit the group's DefaultTenant middleware. Before the fix their
// request context was cross-org — webhook-created rows (finance payments,
// communication logs) inserted with no org_id and were invisible to every
// org-scoped admin read. These tests run the REAL Register wiring and assert
// the request context that reaches each webhook's service layer is pinned to
// the default org.

const testDefaultOrg = "org-webhook-tenant-test"

// ctxCapturingFinance embeds the (nil) FinanceService interface and overrides
// only the first method the finance webhook path calls. Returning false stops
// the handler before any other interface method is touched.
type ctxCapturingFinance struct {
	service.FinanceService
	gotCtx context.Context
}

func (f *ctxCapturingFinance) MarkEventProcessed(ctx context.Context, _ string) bool {
	f.gotCtx = ctx
	return false
}

// ctxCapturingGBP does the same for the GBP digest ingest.
type ctxCapturingGBP struct {
	service.GBPService
	gotCtx context.Context
}

// stubKiosk exists only because Register takes the method value
// svc.Kiosk.Authenticate at registration time — a nil interface would panic
// before any route is exercised. The method is never called in these tests.
type stubKiosk struct{ service.KioskService }

func (g *ctxCapturingGBP) IngestDigest(ctx context.Context, _ models.GBPDigestRequest) error {
	g.gotCtx = ctx
	return nil
}

func newWebhookTestRouter(t *testing.T, fin *ctxCapturingFinance, gbp *ctxCapturingGBP, stripeSecret, gbpSecret string) *chi.Mux {
	t.Helper()
	r := chi.NewRouter()
	svc := Services{
		DefaultOrgID: testDefaultOrg,
		Finance:      fin,
		GBP:          gbp,
		Kiosk:        &stubKiosk{},
	}
	Register(r, svc, Repos{}, "test-jwt-secret", stripeSecret, &config.Config{GBPIngestSecret: gbpSecret})
	return r
}

func assertPinnedToDefaultOrg(t *testing.T, ctx context.Context) {
	t.Helper()
	if ctx == nil {
		t.Fatal("webhook service was never called — request did not reach the service layer")
	}
	org, cross := repository.OrgFromContext(ctx)
	if cross {
		t.Fatal("webhook context is CROSS-ORG — inserts would carry no org_id (the original bug)")
	}
	if org != testDefaultOrg {
		t.Fatalf("webhook context pinned to %q, want default org %q", org, testDefaultOrg)
	}
}

// stripeSign produces a valid Stripe-Signature header for the payload —
// t=<unix>,v1=<hex hmac-sha256 of "<unix>.<payload>"> — matching what
// webhook.ConstructEventWithOptions verifies.
func stripeSign(secret string, payload []byte) string {
	ts := time.Now().Unix()
	mac := hmac.New(sha256.New, []byte(secret))
	fmt.Fprintf(mac, "%d.%s", ts, payload)
	return fmt.Sprintf("t=%d,v1=%s", ts, hex.EncodeToString(mac.Sum(nil)))
}

func TestStripeWebhookRunsUnderDefaultTenant(t *testing.T) {
	const secret = "whsec_test_tenant"
	fin := &ctxCapturingFinance{}
	router := newWebhookTestRouter(t, fin, &ctxCapturingGBP{}, secret, "")

	payload := []byte(`{"id":"evt_tenant_test_1","type":"setup_intent.succeeded","data":{"object":{"customer":"cus_x"}}}`)
	req := httptest.NewRequest("POST", "/api/v1/webhooks/stripe", bytes.NewReader(payload))
	req.Header.Set("Stripe-Signature", stripeSign(secret, payload))
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != 200 {
		t.Fatalf("webhook returned %d, want 200 (body: %s)", rec.Code, rec.Body.String())
	}
	assertPinnedToDefaultOrg(t, fin.gotCtx)
}

func TestGBPDigestRunsUnderDefaultTenant(t *testing.T) {
	const secret = "gbp-test-secret"
	gbp := &ctxCapturingGBP{}
	router := newWebhookTestRouter(t, &ctxCapturingFinance{}, gbp, "whsec_unused", secret)

	req := httptest.NewRequest("POST", "/api/v1/integrations/gbp/digest",
		bytes.NewReader([]byte(`{"branch_slug":"harrow"}`)))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-GBP-Secret", secret)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != 200 {
		t.Fatalf("gbp digest returned %d, want 200 (body: %s)", rec.Code, rec.Body.String())
	}
	assertPinnedToDefaultOrg(t, gbp.gotCtx)
}
