package service

type CheckoutService interface{}

type checkoutService struct{}

func NewCheckoutService() CheckoutService {
	return &checkoutService{}
}
