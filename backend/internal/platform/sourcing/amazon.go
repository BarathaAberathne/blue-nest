package sourcing

import "context"

// AmazonAdapter is a placeholder for the Amazon Business API integration
// (Product Search → Cart → Ordering). It is gated behind AMAZON_BUSINESS_ENABLED
// and only wired in once the Amazon Business account + developer onboarding +
// OAuth tokens + API roles are in place (see plan Phase E). Until then it returns
// no offers so the sourcing engine simply skips Amazon.
type AmazonAdapter struct {
	// future: clientID, refreshToken, region, http client
}

func NewAmazonAdapter() *AmazonAdapter { return &AmazonAdapter{} }

func (a *AmazonAdapter) Supplier() string { return "Amazon" }

func (a *AmazonAdapter) Search(_ context.Context, _ string) ([]Offer, error) {
	// TODO(phase-e): call Amazon Business Product Search API to resolve ASIN,
	// offerId and live price, then return them as Offers for the cheapest-across-
	// suppliers comparison.
	return nil, nil
}
