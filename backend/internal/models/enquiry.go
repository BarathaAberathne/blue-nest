package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Enquiry struct {
	ID          primitive.ObjectID `bson:"_id"          json:"id"`
	Name        string             `bson:"name"         json:"name"`
	Email       string             `bson:"email"        json:"email"`
	Phone       string             `bson:"phone"        json:"phone"`
	Branch      string             `bson:"branch"       json:"branch"`
	ChildAge    string             `bson:"child_age"    json:"child_age"`
	EnquiryType string             `bson:"enquiry_type" json:"enquiry_type"`
	Message     string             `bson:"message"      json:"message"`
	Status      string             `bson:"status"       json:"status"` // "new" | "read" | "responded"
	CreatedAt   time.Time          `bson:"created_at"   json:"created_at"`
}

type EnquiryRequest struct {
	Name        string `json:"name"`
	Email       string `json:"email"`
	Phone       string `json:"phone"`
	Branch      string `json:"branch"`
	ChildAge    string `json:"child_age"`
	EnquiryType string `json:"enquiry_type"`
	Message     string `json:"message"`
	Consent     bool   `json:"consent"`
}
