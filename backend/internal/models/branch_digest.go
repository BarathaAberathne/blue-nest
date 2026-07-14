package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// GBPReview is one Google Business Profile review for a branch. `Reply` empty
// means it's awaiting a response (feeds the pending-reply queue).
type GBPReview struct {
	ID         primitive.ObjectID `bson:"_id,omitempty"      json:"id"`
	BranchSlug string             `bson:"branch_slug"        json:"branch_slug"`
	ReviewID   string             `bson:"review_id"          json:"review_id"` // external GBP id (dedupe key)
	Author     string             `bson:"author"             json:"author"`
	Rating     int                `bson:"rating"             json:"rating"` // 1–5
	Text       string             `bson:"text,omitempty"     json:"text,omitempty"`
	Date       string             `bson:"date"               json:"date"` // YYYY-MM-DD
	Reply      string             `bson:"reply,omitempty"    json:"reply,omitempty"`
	Sentiment  string             `bson:"sentiment,omitempty" json:"sentiment,omitempty"` // positive|neutral|negative
	CreatedAt  time.Time          `bson:"created_at"         json:"created_at"`
	UpdatedAt  time.Time          `bson:"updated_at"         json:"updated_at"`
}

// GBPInsights are the daily GBP performance signals from the digest.
type GBPInsights struct {
	SearchViews       int `bson:"search_views"       json:"search_views"`
	DirectionRequests int `bson:"direction_requests" json:"direction_requests"`
	Calls             int `bson:"calls"              json:"calls"`
	WebsiteClicks     int `bson:"website_clicks"     json:"website_clicks"`
	NewPhotos         int `bson:"new_photos"         json:"new_photos"`
	Questions         int `bson:"questions"          json:"questions"`
}

// BranchDigest is one day's Google Business Profile snapshot for a branch,
// posted by the Claude GBP-monitoring automation. Kept as history for trends.
type BranchDigest struct {
	ID          primitive.ObjectID `bson:"_id,omitempty"    json:"id"`
	BranchSlug  string             `bson:"branch_slug"      json:"branch_slug"`
	Date        string             `bson:"date"             json:"date"` // YYYY-MM-DD
	Rating      float64            `bson:"rating"           json:"rating"`
	ReviewCount int                `bson:"review_count"     json:"review_count"`
	Insights    GBPInsights        `bson:"insights"         json:"insights"`
	Keywords    []LabelCount       `bson:"keywords,omitempty" json:"keywords,omitempty"`
	Sentiment   SentimentSplit     `bson:"sentiment"        json:"sentiment"`
	Source      string             `bson:"source,omitempty" json:"source,omitempty"` // e.g. "claude-digest"
	CreatedAt   time.Time          `bson:"created_at"       json:"created_at"`
}

type SentimentSplit struct {
	Positive int `bson:"positive" json:"positive"`
	Neutral  int `bson:"neutral"  json:"neutral"`
	Negative int `bson:"negative" json:"negative"`
}

// ── Ingest payload (the Claude automation POSTs this per branch, per day) ────
type GBPDigestRequest struct {
	BranchSlug  string           `json:"branch_slug" validate:"required"`
	Date        string           `json:"date"` // defaults to today
	Rating      float64          `json:"rating"`
	ReviewCount int              `json:"review_count"`
	Insights    GBPInsights      `json:"insights"`
	Keywords    []LabelCount     `json:"keywords"`
	Sentiment   SentimentSplit   `json:"sentiment"`
	Reviews     []GBPReviewInput `json:"reviews"`
	Source      string           `json:"source"`
}

type GBPReviewInput struct {
	ReviewID  string `json:"review_id"`
	Author    string `json:"author"`
	Rating    int    `json:"rating"`
	Text      string `json:"text"`
	Date      string `json:"date"`
	Reply     string `json:"reply"`
	Sentiment string `json:"sentiment"`
}

// ── Reviews analytics payload (drives the Reviews dashboard) ─────────────────
type ReviewsAnalytics struct {
	Slug           string         `json:"slug"`
	Rating         float64        `json:"rating"`
	ReviewCount    int            `json:"review_count"`
	LastSync       *time.Time     `json:"last_sync,omitempty"`
	Stale          bool           `json:"stale"`        // true when the latest digest is > 2 days old
	Distribution   [5]int         `json:"distribution"` // index 0 = 1★ … 4 = 5★
	Sentiment      SentimentSplit `json:"sentiment"`
	Keywords       []LabelCount   `json:"keywords"`
	PendingReplies int            `json:"pending_replies"`
	Trend          []RatingPoint  `json:"trend"`
	Insights       GBPInsights    `json:"insights"`
	Recent         []GBPReview    `json:"recent"`
	Negative       []GBPReview    `json:"negative"`
}

type RatingPoint struct {
	Date   string  `json:"date"`
	Rating float64 `json:"rating"`
}
