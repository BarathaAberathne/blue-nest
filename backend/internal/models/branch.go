package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type BranchStatus string

const (
	BranchActive     BranchStatus = "active"
	BranchComingSoon BranchStatus = "coming_soon"
)

type BranchContact struct {
	Phone   string `bson:"phone"   json:"phone"`
	Email   string `bson:"email"   json:"email"`
	Address string `bson:"address" json:"address"`
	MapURL  string `bson:"map_url" json:"map_url,omitempty"`
}

type BranchAdmissions struct {
	AgeRange    string `bson:"age_range"    json:"age_range"`
	OpeningTime string `bson:"opening_time" json:"opening_time"`
	ClosingTime string `bson:"closing_time" json:"closing_time"`
	Notes       string `bson:"notes"        json:"notes,omitempty"`
}

// BranchHours is one day's opening hours.
type BranchHours struct {
	Day    string `bson:"day"    json:"day"` // Mon..Sun
	Open   string `bson:"open"   json:"open"`
	Close  string `bson:"close"  json:"close"`
	Closed bool   `bson:"closed" json:"closed"`
}

// BranchGoogle holds the branch's Google Business Profile link + cached signals.
// The cache is refreshed by the GBP digest ingest (Phase B2); links are set here.
type BranchGoogle struct {
	PlaceID        string     `bson:"place_id,omitempty"        json:"place_id,omitempty"`
	LocationID     string     `bson:"location_id,omitempty"     json:"location_id,omitempty"`
	ReviewURL      string     `bson:"review_url,omitempty"      json:"review_url,omitempty"`
	MapsURL        string     `bson:"maps_url,omitempty"        json:"maps_url,omitempty"`
	Rating         float64    `bson:"rating,omitempty"          json:"rating,omitempty"`
	ReviewCount    int        `bson:"review_count,omitempty"    json:"review_count,omitempty"`
	BusinessStatus string     `bson:"business_status,omitempty" json:"business_status,omitempty"`
	LastSync       *time.Time `bson:"last_sync,omitempty"       json:"last_sync,omitempty"`
}

type BranchSocial struct {
	Facebook  string `bson:"facebook,omitempty"  json:"facebook,omitempty"`
	Instagram string `bson:"instagram,omitempty" json:"instagram,omitempty"`
	Website   string `bson:"website,omitempty"   json:"website,omitempty"`
}

// BranchManagers assigns staff to leadership roles by Staff ID (a relationship —
// staff records live in the staff collection, never duplicated here).
type BranchManagers struct {
	Director      string   `bson:"director,omitempty"       json:"director,omitempty"`
	Regional      string   `bson:"regional,omitempty"       json:"regional,omitempty"`
	BranchManager string   `bson:"branch_manager,omitempty" json:"branch_manager,omitempty"`
	Deputy        string   `bson:"deputy,omitempty"         json:"deputy,omitempty"`
	Assistant     string   `bson:"assistant,omitempty"      json:"assistant,omitempty"`
	KeyPersons    []string `bson:"key_persons,omitempty"    json:"key_persons,omitempty"`
}

type Branch struct {
	ID               primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	OrgID            string             `bson:"org_id,omitempty" json:"org_id,omitempty"`
	Ref              string             `bson:"ref,omitempty" json:"ref,omitempty"` // BR-YYYY-NNNNNN
	Slug             string             `bson:"slug"          json:"slug"`
	Name             string             `bson:"name"          json:"name"`
	Status           BranchStatus       `bson:"status"        json:"status"`
	ShortDescription string             `bson:"short_description" json:"short_description"`
	HeroImageURL     string             `bson:"hero_image_url" json:"hero_image_url,omitempty"`
	LogoURL          string             `bson:"logo_url,omitempty" json:"logo_url,omitempty"`
	Gallery          []string           `bson:"gallery,omitempty" json:"gallery,omitempty"`
	Contact          BranchContact      `bson:"contact"       json:"contact"`
	Admissions       BranchAdmissions   `bson:"admissions"    json:"admissions"`
	// Location
	Postcode string  `bson:"postcode,omitempty"  json:"postcode,omitempty"`
	Lat      float64 `bson:"lat,omitempty"       json:"lat,omitempty"`
	Lng      float64 `bson:"lng,omitempty"       json:"lng,omitempty"`
	Website  string  `bson:"website,omitempty"   json:"website,omitempty"`
	Parking  string  `bson:"parking,omitempty"   json:"parking,omitempty"`
	// Operations
	OpeningHours []BranchHours `bson:"opening_hours,omitempty" json:"opening_hours,omitempty"`
	Capacity     int           `bson:"capacity,omitempty"      json:"capacity,omitempty"`
	AgeGroups    []string      `bson:"age_groups,omitempty"    json:"age_groups,omitempty"`
	// Compliance
	OfstedRating    string `bson:"ofsted_rating,omitempty"     json:"ofsted_rating,omitempty"`
	OfstedReportURL string `bson:"ofsted_report_url,omitempty" json:"ofsted_report_url,omitempty"`
	// Integrations & links
	Google BranchGoogle `bson:"google,omitempty"  json:"google"`
	Social BranchSocial `bson:"social,omitempty"  json:"social"`
	// Leadership (assigned staff IDs — relationships, not copies)
	Managers BranchManagers `bson:"managers,omitempty" json:"managers"`
	// Multi-group future-proofing
	GroupID    string     `bson:"group_id,omitempty"   json:"group_id,omitempty"`
	ArchivedAt *time.Time `bson:"archived_at,omitempty" json:"archived_at,omitempty"`
	CreatedAt  time.Time  `bson:"created_at"    json:"created_at"`
	UpdatedAt  time.Time  `bson:"updated_at"    json:"updated_at"`
}

// BranchRequest is the admin create/update payload (public marketing fields plus
// the operational/integration fields). Slug is required on create.
type BranchRequest struct {
	Slug             string           `json:"slug"`
	Name             string           `json:"name" validate:"required"`
	Status           BranchStatus     `json:"status"`
	ShortDescription string           `json:"short_description"`
	HeroImageURL     string           `json:"hero_image_url"`
	LogoURL          string           `json:"logo_url"`
	Gallery          []string         `json:"gallery"`
	Contact          BranchContact    `json:"contact"`
	Admissions       BranchAdmissions `json:"admissions"`
	Postcode         string           `json:"postcode"`
	Lat              float64          `json:"lat"`
	Lng              float64          `json:"lng"`
	Website          string           `json:"website"`
	Parking          string           `json:"parking"`
	OpeningHours     []BranchHours    `json:"opening_hours"`
	Capacity         int              `json:"capacity"`
	AgeGroups        []string         `json:"age_groups"`
	OfstedRating     string           `json:"ofsted_rating"`
	OfstedReportURL  string           `json:"ofsted_report_url"`
	Google           BranchGoogle     `json:"google"`
	Social           BranchSocial     `json:"social"`
	GroupID          string           `json:"group_id"`
}

// SeedBranches returns the starter branch data for all five locations.
//
// Values mirror what's already hard-coded in the frontend so the API and the
// browser agree about phone numbers, addresses and statuses:
//   - phones from frontend/components/layout/Header.tsx and each branch's
//     JSON-LD block in frontend/app/branches/<slug>/page.tsx
//   - addresses from frontend/components/contact/LeafletMap.tsx (PINS array)
//   - email is the shared manager@bluenest.uk inbox used across the site
//
// If the frontend display ever changes, update this seed and re-run
// `go run ./cmd/seedbranches` so the data stays consistent.
func SeedBranches() []Branch {
	now := time.Now()
	const sharedEmail = "manager@bluenest.uk"
	branches := []Branch{
		{
			ID:               primitive.NewObjectID(),
			Slug:             "harrow",
			Name:             "Blue Nest Montessori School — Harrow",
			Status:           BranchActive,
			ShortDescription: "Our flagship nursery in the heart of Harrow, offering a nurturing Montessori environment for children aged 3 months to 5 years.",
			Contact: BranchContact{
				Phone:   "020 8861 5574",
				Email:   sharedEmail,
				Address: "29 Churchfield Close, Harrow, HA2 6BD",
				MapURL:  "https://www.google.com/maps/search/?api=1&query=29+Churchfield+Close+Harrow+HA2+6BD",
			},
			Admissions: BranchAdmissions{
				AgeRange:    "3 months – 5 years",
				OpeningTime: "07:30",
				ClosingTime: "18:30",
			},
			CreatedAt: now,
			UpdatedAt: now,
		},
		{
			ID:               primitive.NewObjectID(),
			Slug:             "borehamwood",
			Name:             "Blue Nest Montessori School — Borehamwood",
			Status:           BranchActive,
			ShortDescription: "A vibrant Montessori nursery in Borehamwood, fostering curiosity and independence through child-led learning.",
			Contact: BranchContact{
				Phone:   "020 8953 1718",
				Email:   sharedEmail,
				Address: "31-33 Farriers Way, Borehamwood, WD6 2TB",
				MapURL:  "https://www.google.com/maps/search/?api=1&query=31-33+Farriers+Way+Borehamwood+WD6+2TB",
			},
			Admissions: BranchAdmissions{
				AgeRange:    "3 months – 5 years",
				OpeningTime: "07:30",
				ClosingTime: "18:30",
			},
			CreatedAt: now,
			UpdatedAt: now,
		},
		{
			ID:               primitive.NewObjectID(),
			Slug:             "pinner",
			Name:             "Blue Nest Montessori School — Pinner",
			Status:           BranchActive,
			ShortDescription: "Set in leafy Pinner, this branch combines outdoor Forest School activities with our signature Montessori curriculum.",
			Contact: BranchContact{
				Phone:   "07400 430630",
				Email:   sharedEmail,
				Address: "Cuckoo Hill Road, Pinner, HA5 1AY",
				MapURL:  "https://www.google.com/maps/search/?api=1&query=Cuckoo+Hill+Road+Pinner+HA5+1AY",
			},
			Admissions: BranchAdmissions{
				AgeRange:    "3 months – 5 years",
				OpeningTime: "07:30",
				ClosingTime: "18:30",
			},
			CreatedAt: now,
			UpdatedAt: now,
		},
		{
			ID:               primitive.NewObjectID(),
			Slug:             "pinner-green",
			Name:             "Blue Nest Montessori School — Pinner Green",
			Status:           BranchActive,
			ShortDescription: "A child-led Montessori nursery in the heart of Pinner Green, surrounded by leafy outdoor spaces for daily exploration and Forest School sessions.",
			Contact: BranchContact{
				Phone:   "07400 430630",
				Email:   sharedEmail,
				Address: "Pinner Green, Pinner, HA5",
				MapURL:  "https://www.google.com/maps/search/?api=1&query=Pinner+Green+HA5",
			},
			Admissions: BranchAdmissions{
				AgeRange:    "3 months – 5 years",
				OpeningTime: "07:30",
				ClosingTime: "18:30",
			},
			CreatedAt: now,
			UpdatedAt: now,
		},
		{
			ID:               primitive.NewObjectID(),
			Slug:             "northwood",
			Name:             "Blue Nest Montessori School — Northwood",
			Status:           BranchComingSoon,
			ShortDescription: "Our newest branch, coming soon to Northwood, HA6. Register your interest to be first in line for a place at our newest nursery.",
			Contact: BranchContact{
				Email:   sharedEmail,
				Address: "Sandy Lane, Northwood, HA6 3DA",
				MapURL:  "https://www.google.com/maps/search/?api=1&query=Sandy+Lane+Northwood+HA6+3DA",
			},
			Admissions: BranchAdmissions{
				AgeRange: "3 months – 5 years",
				Notes:    "Opening registration available — contact us to register your interest.",
			},
			CreatedAt: now,
			UpdatedAt: now,
		},
	}

	// Enrich with the operational/integration fields (coordinates mirror
	// frontend/components/contact/LeafletMap.tsx PINS; capacity/rating are
	// starter values curated per branch, refined later via the admin UI + GBP).
	type extra struct {
		lat, lng float64
		postcode string
		capacity int
		ofsted   string
		rating   float64
		reviews  int
	}
	enrich := map[string]extra{
		"harrow":       {51.5836, -0.3364, "HA2 6BD", 135, "Outstanding", 4.9, 128},
		"pinner":       {51.5919, -0.3795, "HA5 1AY", 151, "Good", 4.8, 96},
		"borehamwood":  {51.6594, -0.2724, "WD6 2TB", 103, "Good", 4.6, 74},
		"pinner-green": {51.5972, -0.3878, "HA5", 113, "Good", 4.8, 61},
		"northwood":    {51.6091, -0.4186, "HA6 3DA", 50, "Not yet inspected", 0, 0},
	}
	ageGroups := []string{"Babies (3–24m)", "Toddlers (2–3y)", "Pre-school (3–4y)", "Kindergarten (4–5y)"}
	hours := []BranchHours{
		{Day: "Mon", Open: "07:30", Close: "18:30"}, {Day: "Tue", Open: "07:30", Close: "18:30"},
		{Day: "Wed", Open: "07:30", Close: "18:30"}, {Day: "Thu", Open: "07:30", Close: "18:30"},
		{Day: "Fri", Open: "07:30", Close: "18:30"}, {Day: "Sat", Closed: true}, {Day: "Sun", Closed: true},
	}
	for i := range branches {
		b := &branches[i]
		e := enrich[b.Slug]
		b.Lat, b.Lng, b.Postcode, b.Capacity = e.lat, e.lng, e.postcode, e.capacity
		b.AgeGroups = ageGroups
		b.OpeningHours = hours
		b.LogoURL = "/logo/bluenest-logo.png"
		b.Website = "https://bluenest.uk"
		b.OfstedRating = e.ofsted
		mapsQuery := b.Contact.MapURL
		b.Google = BranchGoogle{
			MapsURL:        mapsQuery,
			ReviewURL:      mapsQuery,
			Rating:         e.rating,
			ReviewCount:    e.reviews,
			BusinessStatus: "OPERATIONAL",
		}
		b.Social = BranchSocial{
			Facebook:  "https://facebook.com/bluenestmontessori",
			Instagram: "https://instagram.com/bluenestmontessori",
			Website:   "https://bluenest.uk",
		}
	}
	return branches
}
