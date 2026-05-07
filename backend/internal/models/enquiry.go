package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type FeeQuote struct {
	Branch        string  `bson:"branch,omitempty"         json:"branch,omitempty"`
	AgeGroup      string  `bson:"age_group,omitempty"      json:"age_group,omitempty"`
	Session       string  `bson:"session,omitempty"        json:"session,omitempty"`
	Days          int     `bson:"days,omitempty"           json:"days,omitempty"`
	EarlyBird     bool    `bson:"early_bird,omitempty"     json:"early_bird,omitempty"`
	Funding       string  `bson:"funding,omitempty"        json:"funding,omitempty"`
	GrossWeekly   float64 `bson:"gross_weekly"             json:"gross_weekly"`
	FundingOffset float64 `bson:"funding_offset,omitempty" json:"funding_offset,omitempty"`
	NetWeekly     float64 `bson:"net_weekly"               json:"net_weekly"`
	NetMonthly    float64 `bson:"net_monthly"              json:"net_monthly"`
}

type Enquiry struct {
	ID          primitive.ObjectID `bson:"_id"               json:"id"`
	Name        string             `bson:"name"              json:"name"`
	Email       string             `bson:"email"             json:"email"`
	Phone       string             `bson:"phone"             json:"phone"`
	Branch      string             `bson:"branch"            json:"branch"`
	ChildAge    string             `bson:"child_age"         json:"child_age"`
	EnquiryType string             `bson:"enquiry_type"      json:"enquiry_type"`
	Message     string             `bson:"message"           json:"message"`
	FeeQuote    *FeeQuote          `bson:"fee_quote,omitempty" json:"fee_quote,omitempty"`
	Status      string             `bson:"status"            json:"status"` // "new" | "read" | "responded"
	CreatedAt   time.Time          `bson:"created_at"        json:"created_at"`
}

type EnquiryRequest struct {
	Name        string    `json:"name"`
	Email       string    `json:"email"`
	Phone       string    `json:"phone"`
	Branch      string    `json:"branch"`
	ChildAge    string    `json:"child_age"`
	EnquiryType string    `json:"enquiry_type"`
	Message     string    `json:"message"`
	Consent     bool      `json:"consent"`
	FeeQuote    *FeeQuote `json:"fee_quote,omitempty"`
}
