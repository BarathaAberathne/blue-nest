package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Fee configuration - the per-branch fee/funding rules that drive the public fee
// calculator. Tenant-scoped (org_id). One document per branch holds that
// branch's rates; a single document with BranchSlug "" holds the org-wide Meta
// (extra-hour / swap / late-fee amounts + the disclaimer note). This mirrors the
// shape the calculator already consumes (formerly the hardcoded
// frontend/lib/fee-data.json), so the compute logic is unchanged - it just reads
// configurable data instead of a bundled file.

// FeeSessionRate is the price for one session length (e.g. full_day / morning).
type FeeSessionRate struct {
	Daily  float64 `bson:"daily"  json:"daily"`
	Weekly float64 `bson:"weekly" json:"weekly"`
}

// FeeMeta is the org-wide ancillary pricing + disclaimer (held on the ""-branch doc).
type FeeMeta struct {
	ExtraHour        float64 `bson:"extra_hour"          json:"extraHour"`
	SwapSession      float64 `bson:"swap_session"        json:"swapSession"`
	LateFeePerMinute float64 `bson:"late_fee_per_minute" json:"lateFeePerMinute"`
	Note             string  `bson:"note"                json:"note"`
}

// FeeConfig is one branch's fee rules, or (when BranchSlug is "") the org-wide meta.
type FeeConfig struct {
	ID         primitive.ObjectID `bson:"_id,omitempty" json:"id,omitempty"`
	OrgID      string             `bson:"org_id,omitempty" json:"org_id,omitempty"`
	BranchSlug string             `bson:"branch_slug" json:"branch_slug"` // "" = org-wide meta doc
	// AgeGroups: ageGroupKey ("0-2"/"2-3"/"3-5") -> sessionKey
	// ("full_day"/"morning"/"afternoon"/"school") -> rate.
	AgeGroups map[string]map[string]FeeSessionRate `bson:"age_groups,omitempty" json:"ageGroups,omitempty"`
	// EarlyBird is the per-day early-drop-off surcharge.
	EarlyBird float64 `bson:"early_bird,omitempty" json:"earlyBird,omitempty"`
	// StdFunded: "below3"/"above3" -> sessionKey -> hourly funded rate (top-up
	// billed on funded hours).
	StdFunded map[string]map[string]float64 `bson:"std_funded,omitempty" json:"stdFunded,omitempty"`
	// Meta is set only on the org-wide ("" branch) document.
	Meta      *FeeMeta  `bson:"meta,omitempty" json:"meta,omitempty"`
	UpdatedAt time.Time `bson:"updated_at" json:"updated_at,omitempty"`
}

// FeeConfigBundle is the public shape the calculator consumes: branch rates
// keyed by branch slug, plus the org-wide meta. Identical in structure to the
// former fee-data.json ({ branches, meta }).
type FeeConfigBundle struct {
	Branches map[string]FeeConfig `json:"branches"`
	Meta     *FeeMeta             `json:"meta,omitempty"`
}

// FeeConfigRequest is the admin upsert payload for a single branch's rates.
type FeeConfigRequest struct {
	AgeGroups map[string]map[string]FeeSessionRate `json:"ageGroups"`
	EarlyBird float64                              `json:"earlyBird"`
	StdFunded map[string]map[string]float64        `json:"stdFunded"`
}

// DefaultFeeMeta is the fallback meta used when an org has none configured.
func DefaultFeeMeta() FeeMeta {
	return FeeMeta{
		ExtraHour: 20, SwapSession: 30, LateFeePerMinute: 2,
		Note: "Indicative only. Actual fees may vary by branch, session and funding eligibility.",
	}
}
