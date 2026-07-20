package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// OrderTemplate is a saved, reusable set of supply-request items (a "standing
// order"), shared org-wide. Staff load a template to pre-fill a new request.
type OrderTemplate struct {
	ID            primitive.ObjectID `bson:"_id,omitempty"     json:"id"`
	OrgID         string             `bson:"org_id,omitempty" json:"org_id,omitempty"`
	Name          string             `bson:"name"             json:"name"`
	BranchSlug    string             `bson:"branch_slug,omitempty" json:"branch_slug,omitempty"`
	Items         []OrderRequestItem `bson:"items"            json:"items"`
	CreatedBy     string             `bson:"created_by,omitempty"      json:"created_by,omitempty"`
	CreatedByName string             `bson:"created_by_name,omitempty" json:"created_by_name,omitempty"`
	CreatedAt     time.Time          `bson:"created_at"       json:"created_at"`
}

// CreateOrderTemplateRequest is the save-template payload.
type CreateOrderTemplateRequest struct {
	Name       string             `json:"name"`
	BranchSlug string             `json:"branch_slug"`
	Items      []OrderRequestItem `json:"items"`
}
