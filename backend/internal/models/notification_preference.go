package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// NotificationPreference holds one user's per-type EMAIL opt-outs. In-app
// notifications always appear; MutedTypes lists the notification types the user
// does NOT want emailed. Absent doc = every type emailed (default on).
type NotificationPreference struct {
	ID         primitive.ObjectID `bson:"_id,omitempty" json:"id,omitempty"`
	OrgID      string             `bson:"org_id,omitempty" json:"org_id,omitempty"`
	UserID     string             `bson:"user_id" json:"user_id"`
	MutedTypes []string           `bson:"muted_types" json:"muted_types"`
	UpdatedAt  time.Time          `bson:"updated_at" json:"updated_at,omitempty"`
}

// NotificationTypeInfo describes an emailable notification type (for the prefs UI).
type NotificationTypeInfo struct {
	Type  string `json:"type"`
	Label string `json:"label"`
}

// NotificationTypeCatalogue is the set of user-controllable notification emails.
var NotificationTypeCatalogue = []NotificationTypeInfo{
	{NotifLeaveRequested, "Leave request needs your review"},
	{NotifLeaveApproved, "Your leave was approved"},
	{NotifLeaveDeclined, "Your leave was declined"},
	{NotifDailyLogSubmitted, "Daily log needs your review"},
	{NotifDailyLogApproved, "Your daily log was approved"},
	{NotifDailyLogRejected, "Your daily log was rejected"},
}

// NotificationPreferenceRequest is the self-service update payload.
type NotificationPreferenceRequest struct {
	MutedTypes []string `json:"muted_types"`
}
