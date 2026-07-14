// cmd/seedbranches/main.go — seeds the branches collection with the five
// Blue Nest locations (Harrow, Borehamwood, Pinner, Pinner Green, Northwood).
//
// Run: cd backend && go run ./cmd/seedbranches
//
// Mirror image of cmd/seed/main.go for products — drops the existing collection,
// inserts the canonical data returned by models.SeedBranches(), then creates a
// unique index on slug so future inserts can't shadow an existing branch.
package main

import (
	"context"
	"log"
	"time"

	"github.com/blue-nest-montessori/api/internal/config"
	"github.com/blue-nest-montessori/api/internal/models"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func main() {
	cfg := config.Load()

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	client, err := mongo.Connect(ctx, options.Client().ApplyURI(cfg.Mongo.URI))
	if err != nil {
		log.Fatalf("connect: %v", err)
	}
	defer func() { _ = client.Disconnect(ctx) }()

	if err = client.Ping(ctx, nil); err != nil {
		log.Fatalf("ping: %v", err)
	}
	log.Printf("Connected → db=%s", cfg.Mongo.Database)

	coll := client.Database(cfg.Mongo.Database).Collection("branches")

	// Idempotent upsert by slug (never drop) — the branches collection is now the
	// hub other modules (children/staff/rooms/…) reference, and admins edit rich
	// fields via the UI, so a re-seed must not wipe their changes. We only $set
	// the seed-owned marketing/starter fields, leaving admin-managed fields
	// (managers, gallery, custom hours, etc.) and operational links intact on
	// existing rows; new fields are added on first run.
	branches := models.SeedBranches()
	for _, b := range branches {
		set := bson.M{
			"name": b.Name, "status": b.Status, "short_description": b.ShortDescription,
			"contact": b.Contact, "admissions": b.Admissions,
			"lat": b.Lat, "lng": b.Lng, "postcode": b.Postcode, "capacity": b.Capacity,
			"age_groups": b.AgeGroups, "opening_hours": b.OpeningHours, "logo_url": b.LogoURL,
			"website": b.Website, "ofsted_rating": b.OfstedRating, "social": b.Social, "updated_at": b.UpdatedAt,
			// Starter Google signals (rating/review links). The GBP digest ingest
			// (B2) refreshes these from the real profile; until then the seed values
			// stand. Merged with $ so any live-synced last_sync survives.
			"google.rating":          b.Google.Rating,
			"google.review_count":    b.Google.ReviewCount,
			"google.maps_url":        b.Google.MapsURL,
			"google.review_url":      b.Google.ReviewURL,
			"google.business_status": b.Google.BusinessStatus,
		}
		res, err := coll.UpdateOne(ctx,
			bson.M{"slug": b.Slug},
			bson.M{
				"$set":         set,
				"$setOnInsert": bson.M{"slug": b.Slug, "created_at": b.CreatedAt},
			},
			options.Update().SetUpsert(true),
		)
		if err != nil {
			log.Fatalf("upsert %s: %v", b.Slug, err)
		}
		if res.UpsertedCount > 0 {
			log.Printf("  + inserted %s", b.Slug)
		} else {
			log.Printf("  ✓ updated  %s", b.Slug)
		}
	}

	// Unique index on slug — same guarantee we just added for users.email, so
	// nobody can `db.branches.insertOne({slug:"harrow",...})` and shadow the
	// real Harrow branch.
	if _, err = coll.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys:    bson.D{{Key: "slug", Value: 1}},
		Options: options.Index().SetUnique(true).SetName("uniq_branch_slug"),
	}); err != nil {
		log.Printf("WARN slug index: %v", err)
	}

	log.Println("\nSeed complete ✓")
	for _, b := range branches {
		statusBadge := "active     "
		if b.Status == models.BranchComingSoon {
			statusBadge = "coming-soon"
		}
		log.Printf("  %s  %-14s  %s", statusBadge, b.Slug, b.Name)
	}
}
