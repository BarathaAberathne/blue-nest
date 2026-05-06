package webhooks

import (
	"encoding/json"
	"io"
	"net/http"

	"github.com/blue-nest-montessori/api/internal/repository"
	"github.com/blue-nest-montessori/api/pkg/response"
	stripe "github.com/stripe/stripe-go/v76"
	"github.com/stripe/stripe-go/v76/webhook"
)

type StripeWebhookHandler struct {
	webhookSecret string
	orders        repository.OrderRepository
	products      repository.ProductRepository
}

func NewStripeWebhookHandler(secret string, orders repository.OrderRepository, products repository.ProductRepository) *StripeWebhookHandler {
	return &StripeWebhookHandler{webhookSecret: secret, orders: orders, products: products}
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
		var session stripe.CheckoutSession
		if err := json.Unmarshal(event.Data.Raw, &session); err != nil {
			break
		}
		orderID := session.Metadata["order_id"]
		if orderID == "" {
			break
		}
		ctx := r.Context()
		_ = h.orders.UpdateStatus(ctx, orderID, "paid")
		order, err := h.orders.FindByID(ctx, orderID)
		if err != nil {
			break
		}
		for _, item := range order.Items {
			_ = h.products.DecrementStock(ctx, item.ProductID.Hex(), item.Qty)
		}

	case stripe.EventTypePaymentIntentPaymentFailed:
		// TODO: mark order cancelled, restore stock if pre-reserved
	}

	response.OK(w, map[string]string{"received": "true"})
}
