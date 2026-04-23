package stripe

import (
	"github.com/stripe/stripe-go/v76"
)

// Init configures the Stripe SDK with the provided secret key.
// Call this once at application startup.
func Init(secretKey string) {
	stripe.Key = secretKey
}
