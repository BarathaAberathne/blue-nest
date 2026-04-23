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

// SeedBranches returns the starter branch data for all four locations.
func SeedBranches() []Branch {
	now := time.Now()
	return []Branch{
		{
			ID:               primitive.NewObjectID(),
			Slug:             "harrow",
			Name:             "Blue Nest Montessori – Harrow",
			Status:           BranchActive,
			ShortDescription: "Our flagship nursery in the heart of Harrow, offering a nurturing Montessori environment for children aged 3 months to 5 years.",
			Contact: BranchContact{
				Phone:   "+44 20 0000 0001",
				Email:   "harrow@bluenestmontessori.co.uk",
				Address: "Harrow, London, HA1",
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
			Name:             "Blue Nest Montessori – Borehamwood",
			Status:           BranchActive,
			ShortDescription: "A vibrant Montessori nursery in Borehamwood, fostering curiosity and independence through child-led learning.",
			Contact: BranchContact{
				Phone:   "+44 20 0000 0002",
				Email:   "borehamwood@bluenestmontessori.co.uk",
				Address: "Borehamwood, Hertfordshire, WD6",
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
			Name:             "Blue Nest Montessori – Pinner",
			Status:           BranchActive,
			ShortDescription: "Set in leafy Pinner, this branch combines outdoor Forest School activities with our signature Montessori curriculum.",
			Contact: BranchContact{
				Phone:   "+44 20 0000 0003",
				Email:   "pinner@bluenestmontessori.co.uk",
				Address: "Pinner, London, HA5",
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
			Name:             "Blue Nest Montessori – Northwood",
			Status:           BranchComingSoon,
			ShortDescription: "Our newest branch, coming soon to Northwood. Register your interest to be first in line for a place.",
			Contact: BranchContact{
				Email:   "northwood@bluenestmontessori.co.uk",
				Address: "Northwood, London, HA6",
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
