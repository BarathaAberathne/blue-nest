package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// AuditLog is an append-only record of an action a management user took on the
// admin dashboard (e.g. updated an enquiry status, created a user). It is the
// foundation for accountability as the system grows toward a full nursery
// management platform. Records are never updated or deleted.
type AuditLog struct {
	ID         primitive.ObjectID     `bson:"_id,omitempty" json:"id"`
	ActorID    string                 `bson:"actor_id"      json:"actor_id"`
	ActorEmail string                 `bson:"actor_email"   json:"actor_email"`
	ActorRole  string                 `bson:"actor_role"    json:"actor_role"`
	Action     string                 `bson:"action"        json:"action"`      // e.g. "update", "create", "delete"
	EntityType string                 `bson:"entity_type"   json:"entity_type"` // e.g. "enquiry", "order", "user"
	EntityID   string                 `bson:"entity_id,omitempty"   json:"entity_id,omitempty"`
	Summary    string                 `bson:"summary"       json:"summary"` // human-readable one-liner
	Details    map[string]interface{} `bson:"details,omitempty"     json:"details,omitempty"`
	IPAddress  string                 `bson:"ip_address,omitempty"  json:"ip_address,omitempty"`
	CreatedAt  time.Time              `bson:"created_at"    json:"created_at"`
}

// AuditLogFilter narrows an audit-log query. Empty fields are ignored.
type AuditLogFilter struct {
	ActorEmail string
	EntityType string
	Action     string
	Limit      int64
}
