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
	UserID     string         `json:"-"`
	SuccessURL string         `json:"success_url"`
	CancelURL  string         `json:"cancel_url"`
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
	stripeActive bool
}

func NewCheckoutService(
	orders repository.OrderRepository,
	carts repository.CartRepository,
	products repository.ProductRepository,
	stripeSecret string,
) CheckoutService {
	return &checkoutService{
		orders:       orders,
		carts:        carts,
		products:     products,
		stripeActive: strings.TrimSpace(stripeSecret) != "",
	}
}

func (s *checkoutService) CreateSession(ctx context.Context, input CreateCheckoutSessionInput) (*CreateCheckoutSessionResult, error) {
	if strings.TrimSpace(input.UserID) == "" {
		return nil, errors.New("user id is required")
	}
	if strings.TrimSpace(input.SuccessURL) == "" || strings.TrimSpace(input.CancelURL) == "" {
		return nil, errors.New("success_url and cancel_url are required")
	}

	userOID, err := primitive.ObjectIDFromHex(input.UserID)
	if err != nil {
		return nil, errors.New("invalid user id")
	}

	cart, err := s.carts.FindByUserID(ctx, input.UserID)
	if err != nil {
		return nil, errors.New("cart is empty")
	}
	if len(cart.Items) == 0 {
		return nil, errors.New("cart is empty")
	}

	lineItems := make([]*stripe.CheckoutSessionLineItemParams, 0, len(cart.Items))
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

	order, err := s.orders.Create(ctx, models.Order{
		UserID:          userOID,
		Items:           orderItems,
		Status:          models.OrderPending,
		TotalAmount:     totalAmount,
		Currency:        "gbp",
		ShippingAddress: models.ShippingAddress{},
	})
	if err != nil {
		return nil, fmt.Errorf("create order: %w", err)
	}

	_ = s.carts.ClearByUserID(ctx, input.UserID)

	if !s.stripeActive {
		_ = s.orders.UpdateStatus(ctx, order.ID.Hex(), string(models.OrderPaid))
		for _, item := range orderItems {
			_ = s.products.DecrementStock(ctx, item.ProductID.Hex(), item.Qty)
		}
		return &CreateCheckoutSessionResult{
			SessionID: "local_" + order.ID.Hex(),
			URL:       input.SuccessURL + "?order_id=" + order.ID.Hex(),
			OrderID:   order.ID.Hex(),
		}, nil
	}

	params := &stripe.CheckoutSessionParams{
		Mode:       stripe.String(string(stripe.CheckoutSessionModePayment)),
		SuccessURL: stripe.String(input.SuccessURL),
		CancelURL:  stripe.String(input.CancelURL),
		LineItems:  lineItems,
	}
	params.Metadata = map[string]string{
		"user_id":  input.UserID,
		"order_id": order.ID.Hex(),
	}

	session, err := checkoutsession.New(params)
	if err != nil {
		_ = s.orders.UpdateStatus(ctx, order.ID.Hex(), string(models.OrderPaid))
		for _, item := range orderItems {
			_ = s.products.DecrementStock(ctx, item.ProductID.Hex(), item.Qty)
		}
		return &CreateCheckoutSessionResult{
			SessionID: "local_" + order.ID.Hex(),
			URL:       input.SuccessURL + "?order_id=" + order.ID.Hex(),
			OrderID:   order.ID.Hex(),
		}, nil
	}

	return &CreateCheckoutSessionResult{
		SessionID: session.ID,
		URL:       session.URL,
		OrderID:   order.ID.Hex(),
	}, nil
}
