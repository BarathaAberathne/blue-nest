// cmd/seedorg/main.go — bootstraps the DEFAULT ORGANISATION on a fresh
// database, then back-stamps org_id onto any tenant-scoped rows that lack it.
//
// Why this exists: the retired one-shot tenancy migration created the first
// Organisation on every real environment, so nothing in the codebase can
// bootstrap a brand-new database anymore — the server only RESOLVES the
// default org at startup, seedtaxonomy/seedfees refuse to run without one,
// and rows written by the direct-to-Mongo seeds carry no org_id (an admin
// with no org claim runs cross-org, masking the problem). CI's throwaway
// database hit exactly this; a fresh dev install would too.
//
// Run FIRST (before the other seeds and before the API boots, which resolves
// the default org at startup): cd backend && go run ./cmd/seedorg
// Run it AGAIN after the other seeds to back-stamp anything they created.
//
// Idempotent: upserts the org by slug ($setOnInsert — never overwrites an
// existing org), and the back-stamp only touches rows missing org_id.
// Safe on prod (where everything is already stamped, it is a no-op).
package main

import (
	"context"
	"log"
	"time"

	"github.com/blue-nest-montessori/api/internal/config"
	"github.com/blue-nest-montessori/api/internal/models"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	mongoopts "go.mongodb.org/mongo-driver/mongo/options"
	"os"
)

// globalCollections hold platform-wide data and must NEVER be org-stamped
// (mirrors the repository layer: counters + organisations are global,
// webhook_events is the cross-org Stripe idempotency ledger).
var globalCollections = map[string]bool{
	"organisations":  true,
	"counters":       true,
	"webhook_events": true,
}

func main() {
	cfg := config.Load()
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	client, err := mongo.Connect(ctx, mongoopts.Client().ApplyURI(cfg.Mongo.URI))
	if err != nil {
		log.Fatalf("connect: %v", err)
	}
	defer func() { _ = client.Disconnect(context.Background()) }()
	db := client.Database(cfg.Mongo.Database)
	log.Printf("Connected → db=%s", cfg.Mongo.Database)

	slug := os.Getenv("DEFAULT_ORG_SLUG")
	if slug == "" {
		slug = "blue-nest"
	}
	now := time.Now()
	after := mongoopts.After
	var org models.Organisation
	err = db.Collection("organisations").FindOneAndUpdate(ctx,
		bson.M{"slug": slug},
		bson.M{
			"$set": bson.M{"updated_at": now},
			"$setOnInsert": bson.M{
				"slug":       slug,
				"name":       "Blue Nest Montessori",
				"status":     string(models.OrgActive),
				"created_at": now,
			},
		},
		&mongoopts.FindOneAndUpdateOptions{Upsert: boolPtr(true), ReturnDocument: &after},
	).Decode(&org)
	if err != nil {
		log.Fatalf("ensure default organisation: %v", err)
	}
	orgID := org.ID.Hex()
	log.Printf("Default organisation ready: %s (%s)", slug, orgID)

	// Back-stamp: every tenant-scoped collection's unstamped rows join the
	// default org. On a database with more than one organisation this is
	// REFUSED — ambiguous rows there need the operator, not a guess.
	count, err := db.Collection("organisations").CountDocuments(ctx, bson.M{})
	if err != nil {
		log.Fatalf("count organisations: %v", err)
	}
	if count > 1 {
		log.Printf("multiple organisations exist — skipping the back-stamp (nothing to guess for)")
		return
	}
	names, err := db.ListCollectionNames(ctx, bson.M{})
	if err != nil {
		log.Fatalf("list collections: %v", err)
	}
	var stamped int64
	for _, name := range names {
		if globalCollections[name] {
			continue
		}
		res, err := db.Collection(name).UpdateMany(ctx,
			bson.M{"org_id": bson.M{"$exists": false}},
			bson.M{"$set": bson.M{"org_id": orgID}})
		if err != nil {
			log.Fatalf("back-stamp %s: %v", name, err)
		}
		if res.ModifiedCount > 0 {
			log.Printf("  stamped %d row(s) in %s", res.ModifiedCount, name)
			stamped += res.ModifiedCount
		}
	}
	log.Printf("Org seed complete ✓ (%d row(s) back-stamped)", stamped)
}

func boolPtr(b bool) *bool { return &b }
