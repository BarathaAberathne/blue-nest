package service

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/blue-nest-montessori/api/internal/models"
	"github.com/blue-nest-montessori/api/internal/repository"
	"github.com/stripe/stripe-go/v76"
	checkoutsession "github.com/stripe/stripe-go/v76/checkout/session"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type CreateCheckoutSessionInput struct {
	UserID string `json:"-"`
	// Customer details collected by the in-app checkout form (required, except
	// where noted). The delivery + billing addresses are collected/validated by
	// Stripe's hosted checkout and reconciled onto the order by the webhook.
	CustomerName  string `json:"customer_name"`
	CustomerEmail string `json:"customer_email"`
	CustomerPhone string `json:"customer_phone"`
	// Nursery branch is optional: empty or "n/a" == Not applicable.
	BranchSlug string `json:"branch_slug"`
	ChildRef   string `json:"child_ref"`
	SuccessURL string `json:"success_url"`
	CancelURL  string `json:"cancel_url"`
}

type CreateCheckoutSessionResult struct {
	SessionID string `json:"session_id"`
	URL       string `json:"url"`
	OrderID   string `json:"order_id,omitempty"`
}

type CheckoutService interface {
	CreateSession(ctx context.Context, input CreateCheckoutSessionInput) (*CreateCheckoutSessionResult, error)
}

type checkoutService struct {
	orders       repository.OrderRepository
	carts        repository.CartRepository
	products     repository.ProductRepository
	branches     repository.BranchRepository
	appEnv       string
	stripeActive bool
}

func NewCheckoutService(
	orders repository.OrderRepository,
	carts repository.CartRepository,
	products repository.ProductRepository,
	branches repository.BranchRepository,
	stripeSecret string,
	appEnv string,
) CheckoutService {
	return &checkoutService{
		orders:       orders,
		carts:        carts,
		products:     products,
		branches:     branches,
		appEnv:       appEnv,
		stripeActive: strings.TrimSpace(stripeSecret) != "",
	}
}

// resolveBranch validates the (optional) branch slug and returns a stable
// (slug, name) snapshot. Empty/"n/a" means the order isn't tied to a nursery.
func (s *checkoutService) resolveBranch(ctx context.Context, slug string) (string, string, error) {
	slug = strings.ToLower(strings.TrimSpace(slug))
	if slug == "" || slug == models.BranchNotApplicable {
		return models.BranchNotApplicable, "Not applicable", nil
	}
	branch, err := s.branches.FindBySlug(ctx, slug)
	if err != nil || branch == nil {
		return "", "", fmt.Errorf("invalid branch: %s", slug)
	}
	return branch.Slug, branch.Name, nil
}

func (s *checkoutService) CreateSession(ctx context.Context, input CreateCheckoutSessionInput) (*CreateCheckoutSessionResult, error) {
	if strings.TrimSpace(input.UserID) == "" {
		return nil, errors.New("user id is required")
	}
	// Required customer fields (server-side validation; the form validates too).
	if strings.TrimSpace(input.CustomerName) == "" {
		return nil, errors.New("full name is required")
	}
	if strings.TrimSpace(input.CustomerEmail) == "" {
		return nil, errors.New("email is required")
	}
	if strings.TrimSpace(input.CustomerPhone) == "" {
		return nil, errors.New("telephone number is required")
	}
	if strings.TrimSpace(input.SuccessURL) == "" || strings.TrimSpace(input.CancelURL) == "" {
		return nil, errors.New("success_url and cancel_url are required")
	}

	userOID, err := primitive.ObjectIDFromHex(input.UserID)
	if err != nil {
		return nil, errors.New("invalid user id")
	}

	branchSlug, branchName, err := s.resolveBranch(ctx, input.BranchSlug)
	if err != nil {
		return nil, err
	}

	cart, err := s.carts.FindByUserID(ctx, input.UserID)
	if err != nil {
		return nil, errors.New("cart is empty")
	}
	if len(cart.Items) == 0 {
		return nil, errors.New("cart is empty")
	}

	const freeShippingThreshold int64 = 3000 // £30.00
	const shippingPence int64 = 399          // £3.99

	lineItems := make([]*stripe.CheckoutSessionLineItemParams, 0, len(cart.Items)+1)
	orderItems := make([]models.OrderItem, 0, len(cart.Items))
	var totalAmount int64

	for _, item := range cart.Items {
		if item.Qty <= 0 {
			return nil, errors.New("invalid cart item quantity")
		}

		product, productErr := s.products.FindByID(ctx, item.ProductID.Hex())
		if productErr != nil {
			return nil, fmt.Errorf("product not found: %s", item.ProductID.Hex())
		}
		if !product.IsActive {
			return nil, fmt.Errorf("product is unavailable: %s", product.Name)
		}
		if product.StockQty > 0 && item.Qty > product.StockQty {
			return nil, fmt.Errorf("insufficient stock for %s", product.Name)
		}

		unitPrice := product.Price
		if unitPrice <= 0 {
			return nil, fmt.Errorf("invalid price for %s", product.Name)
		}

		displayName := product.Name
		if item.Size != "" {
			displayName = product.Name + " (" + item.Size + ")"
		}

		lineItems = append(lineItems, &stripe.CheckoutSessionLineItemParams{
			PriceData: &stripe.CheckoutSessionLineItemPriceDataParams{
				Currency: stripe.String("gbp"),
				ProductData: &stripe.CheckoutSessionLineItemPriceDataProductDataParams{
					Name: stripe.String(displayName),
				},
				UnitAmount: stripe.Int64(unitPrice),
			},
			Quantity: stripe.Int64(int64(item.Qty)),
		})

		totalAmount += unitPrice * int64(item.Qty)
		orderItems = append(orderItems, models.OrderItem{
			ProductID: product.ID,
			Name:      product.Name,
			Price:     unitPrice,
			Qty:       item.Qty,
			Size:      item.Size,
		})
	}

	shipping := int64(0)
	if totalAmount < freeShippingThreshold {
		shipping = shippingPence
		lineItems = append(lineItems, &stripe.CheckoutSessionLineItemParams{
			PriceData: &stripe.CheckoutSessionLineItemPriceDataParams{
				Currency: stripe.String("gbp"),
				ProductData: &stripe.CheckoutSessionLineItemPriceDataProductDataParams{
					Name: stripe.String("Standard Shipping"),
				},
				UnitAmount: stripe.Int64(shippingPence),
			},
			Quantity: stripe.Int64(1),
		})
	}
	totalAmount += shipping

	// Create the internal order FIRST (pending_payment) — the DB is the source of
	// truth; the customer snapshot survives even if the account changes later.
	order, err := s.orders.Create(ctx, models.Order{
		UserID:        userOID,
		Items:         orderItems,
		Status:        models.OrderPending,
		PaymentStatus: models.PaymentUnpaid,
		TotalAmount:   totalAmount,
		Currency:      "gbp",
		CustomerName:  strings.TrimSpace(input.CustomerName),
		CustomerEmail: strings.TrimSpace(input.CustomerEmail),
		CustomerPhone: strings.TrimSpace(input.CustomerPhone),
		BranchSlug:    branchSlug,
		BranchName:    branchName,
		ChildRef:      strings.TrimSpace(input.ChildRef),
	})
	if err != nil {
		return nil, fmt.Errorf("create order: %w", err)
	}

	logWarnIf(s.carts.ClearByUserID(ctx, input.UserID),
		"checkout: cart not cleared after order create", "order_id", order.ID.Hex())

	// No Stripe key configured (local/dev) — mark paid immediately so the flow works.
	if !s.stripeActive {
		logErrorIf(s.orders.MarkPaid(ctx, order.ID.Hex(), "local_"+order.ID.Hex(), ""),
			"checkout: order NOT marked paid (no-Stripe path) — order stuck pending while customer sees success",
			"order_id", order.ID.Hex())
		for _, item := range orderItems {
			logErrorIf(s.products.DecrementStock(ctx, item.ProductID.Hex(), item.Qty),
				"checkout: stock NOT decremented — oversell risk", "product_id", item.ProductID.Hex(), "qty", item.Qty)
		}
		return &CreateCheckoutSessionResult{
			SessionID: "local_" + order.ID.Hex(),
			URL:       input.SuccessURL + "?order_id=" + order.ID.Hex(),
			OrderID:   order.ID.Hex(),
		}, nil
	}

	params := &stripe.CheckoutSessionParams{
		Mode:              stripe.String(string(stripe.CheckoutSessionModePayment)),
		SuccessURL:        stripe.String(input.SuccessURL + "?order_id=" + order.ID.Hex()),
		CancelURL:         stripe.String(input.CancelURL),
		LineItems:         lineItems,
		ClientReferenceID: stripe.String(order.ID.Hex()),
		CustomerEmail:     stripe.String(strings.TrimSpace(input.CustomerEmail)),
	}
	// Stripe collects + validates the delivery, billing address and phone. The
	// webhook reconciles these (verified) values back onto the order.
	params.ShippingAddressCollection = &stripe.CheckoutSessionShippingAddressCollectionParams{
		AllowedCountries: []*string{stripe.String("GB")},
	}
	params.BillingAddressCollection = stripe.String("required")
	params.PhoneNumberCollection = &stripe.CheckoutSessionPhoneNumberCollectionParams{
		Enabled: stripe.Bool(true),
	}
	// Metadata: stable references only (no sensitive/large data — the DB holds the
	// full record). Lets us match the payment back to the internal order.
	params.Metadata = map[string]string{
		"order_id":    order.ID.Hex(),
		"user_id":     input.UserID,
		"branch_slug": branchSlug,
		"branch_name": branchName,
		"env":         s.appEnv,
	}
	// Mirror onto the PaymentIntent so payment_intent.* webhooks can find the order.
	params.PaymentIntentData = &stripe.CheckoutSessionPaymentIntentDataParams{
		Metadata: map[string]string{"order_id": order.ID.Hex(), "env": s.appEnv},
	}

	session, err := checkoutsession.New(params)
	if err != nil {
		// Stripe session creation failed — cancel the pending order so it doesn't
		// linger as "pending" and confuse the admin view.
		logWarnIf(s.orders.UpdateStatus(ctx, order.ID.Hex(), string(models.OrderCancelled)),
			"checkout: draft order not cancelled after Stripe session failure", "order_id", order.ID.Hex())
		return nil, fmt.Errorf("create stripe session: %w", err)
	}

	// Persist the session id so the order is traceable before the webhook lands.
	logWarnIf(s.orders.AttachStripeSession(ctx, order.ID.Hex(), session.ID),
		"checkout: stripe session id not attached — webhook reconciliation falls back to metadata",
		"order_id", order.ID.Hex(), "session_id", session.ID)

	return &CreateCheckoutSessionResult{
		SessionID: session.ID,
		URL:       session.URL,
		OrderID:   order.ID.Hex(),
	}, nil
}
