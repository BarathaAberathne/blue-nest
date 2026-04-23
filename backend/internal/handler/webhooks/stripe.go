package webhooks

import (
	"io"
	"net/http"

	"github.com/blue-nest-montessori/api/pkg/response"
	stripe "github.com/stripe/stripe-go/v76"
	"github.com/stripe/stripe-go/v76/webhook"
)

type StripeWebhookHandler struct {
	webhookSecret string
}

func NewStripeWebhookHandler(secret string) *StripeWebhookHandler {
	return &StripeWebhookHandler{webhookSecret: secret}
}

func (h *StripeWebhookHandler) Handle(w http.ResponseWriter, r *http.Request) {
	const maxBodyBytes = int64(65536)
	r.Body = http.MaxBytesReader(w, r.Body, maxBodyBytes)

	body, err := io.ReadAll(r.Body)
	if err != nil {
		response.BadRequest(w, "failed to read body")
		return
	}

	sig := r.Header.Get("Stripe-Signature")
	event, err := webhook.ConstructEvent(body, sig, h.webhookSecret)
	if err != nil {
		response.BadRequest(w, "invalid stripe signature")
		return
	}

	switch event.Type {
	case stripe.EventTypeCheckoutSessionCompleted:
		// TODO: fulfill order
	case stripe.EventTypePaymentIntentPaymentFailed:
		// TODO: handle failure
	}

	response.OK(w, map[string]string{"received": "true"})
}
