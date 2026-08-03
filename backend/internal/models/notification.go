package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Notification types (extend as new emitters are added).
const (
	NotifDailyLogSubmitted = "daily_log_submitted" // → approvers: a log needs review
	NotifDailyLogApproved  = "daily_log_approved"  // → author: their log was approved
	NotifDailyLogRejected  = "daily_log_rejected"  // → author: their log was rejected

	NotifLeaveRequested = "leave_requested" // → approvers: a leave request needs review
	NotifLeaveApproved  = "leave_approved"  // → applicant: their leave was approved
	NotifLeaveDeclined  = "leave_declined"  // → applicant: their leave was declined
)

// Notification is one in-app message addressed to a single user (recipient).
// Tenant-scoped by org_id; the bell reads the caller's own unread/recent set.
type Notification struct {
	ID         primitive.ObjectID `bson:"_id,omitempty"        json:"id"`
	OrgID      string             `bson:"org_id,omitempty"     json:"org_id,omitempty"`
	UserID     string             `bson:"user_id"              json:"user_id"` // recipient
	Type       string             `bson:"type"                 json:"type"`
	Title      string             `bson:"title"                json:"title"`
	Body       string             `bson:"body,omitempty"       json:"body,omitempty"`
	Link       string             `bson:"link,omitempty"       json:"link,omitempty"` // in-app href
	EntityType string             `bson:"entity_type,omitempty" json:"entity_type,omitempty"`
	EntityID   string             `bson:"entity_id,omitempty"  json:"entity_id,omitempty"`
	Read       bool               `bson:"read"                 json:"read"`
	ReadAt     *time.Time         `bson:"read_at,omitempty"    json:"read_at,omitempty"`
	CreatedAt  time.Time          `bson:"created_at"           json:"created_at"`
}
