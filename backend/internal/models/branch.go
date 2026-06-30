package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type BranchStatus string

const (
	BranchActive    BranchStatus = "active"
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

type Branch struct {
	ID              primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Slug            string             `bson:"slug"          json:"slug"`
	Name            string             `bson:"name"          json:"name"`
	Status          BranchStatus       `bson:"status"        json:"status"`
	ShortDescription string            `bson:"short_description" json:"short_description"`
	HeroImageURL    string             `bson:"hero_image_url" json:"hero_image_url,omitempty"`
	Contact         BranchContact      `bson:"contact"       json:"contact"`
	Admissions      BranchAdmissions   `bson:"admissions"    json:"admissions"`
	CreatedAt       time.Time          `bson:"created_at"    json:"created_at"`
	UpdatedAt       time.Time          `bson:"updated_at"    json:"updated_at"`
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
	return []Branch{
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
}
