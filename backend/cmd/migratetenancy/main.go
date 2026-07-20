// Command migratetenancy is the idempotent Phase-T0 migration: it creates the
// first Organisation (the tenant that owns all existing data) and back-stamps
// `org_id` onto every existing document in every tenant-scoped collection.
//
// Safe to re-run: it only creates the org if missing and only stamps documents
// that don't yet have an org_id. Uses raw Mongo (the tenant wrapper is bypassed).
//
// Run:  cd backend && go run ./cmd/migratetenancy
// Env:  DEFAULT_ORG_SLUG (default "blue-nest"), DEFAULT_ORG_NAME
//
//	(default "Blue Nest Montessori").
package main

import (
	"context"
	"log"
	"os"
	"time"

	"github.com/blue-nest-montessori/api/internal/config"
	"github.com/blue-nest-montessori/api/internal/models"
	"github.com/joho/godotenv"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// tenantCollections are every collection that carries org_id. NOT included:
// organisations (the tenant registry) and counters (platform-global sequences).
var tenantCollections = []string{
	"branches", "rooms", "children", "staff", "staff_attendance", "shifts",
	"kiosk_devices", "attendance", "daily_records", "enquiries",
	"orders", "order_requests", "order_templates", "purchase_carts",
	"catalogue_items", "suppliers", "products", "categories", "carts",
	"blog_posts", "blog_comments", "users", "audit_logs",
	"dashboard_layouts", "dashboard_profiles", "roles",
	"branch_digests", "branch_reviews",
}

func env(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}

func main() {
	for _, path := range []string{".env", "../.env", "../../.env"} {
		if err := godotenv.Load(path); err == nil {
			break
		}
	}
	cfg := config.Load()
	ctx, cancel := context.WithTimeout(context.Background(), 120*time.Second)
	defer cancel()

	client, err := mongo.Connect(ctx, options.Client().ApplyURI(cfg.Mongo.URI))
	if err != nil {
		log.Fatalf("connect: %v", err)
	}
	defer func() { _ = client.Disconnect(ctx) }()
	if err := client.Ping(ctx, nil); err != nil {
		log.Fatalf("ping: %v", err)
	}
	db := client.Database(cfg.Mongo.Database)
	log.Printf("Connected → db=%s", cfg.Mongo.Database)

	slug := env("DEFAULT_ORG_SLUG", "blue-nest")
	name := env("DEFAULT_ORG_NAME", "Blue Nest Montessori")

	// 1) Ensure the default organisation exists (idempotent by slug).
	orgs := db.Collection("organisations")
	_, _ = orgs.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys: bson.D{{Key: "slug", Value: 1}}, Options: options.Index().SetUnique(true),
	})
	var org models.Organisation
	err = orgs.FindOne(ctx, bson.M{"slug": slug}).Decode(&org)
	if err == mongo.ErrNoDocuments {
		org = models.Organisation{
			ID: primitive.NewObjectID(), Slug: slug, Name: name, Status: models.OrgActive,
			CreatedAt: time.Now(), UpdatedAt: time.Now(),
		}
		if _, err := orgs.InsertOne(ctx, org); err != nil {
			log.Fatalf("create org: %v", err)
		}
		log.Printf("Created organisation %q (%s) id=%s", name, slug, org.ID.Hex())
	} else if err != nil {
		log.Fatalf("lookup org: %v", err)
	} else {
		log.Printf("Organisation %q already exists id=%s", slug, org.ID.Hex())
	}
	orgID := org.ID.Hex()

	// 2) Back-stamp org_id onto every document that lacks one.
	total := int64(0)
	for _, name := range tenantCollections {
		res, err := db.Collection(name).UpdateMany(ctx,
			bson.M{"org_id": bson.M{"$exists": false}},
			bson.M{"$set": bson.M{"org_id": orgID}},
		)
		if err != nil {
			log.Printf("  %-20s ERROR: %v", name, err)
			continue
		}
		if res.ModifiedCount > 0 {
			log.Printf("  %-20s %d stamped", name, res.ModifiedCount)
		}
		total += res.ModifiedCount
	}
	log.Printf("Tenancy migration complete ✓ — %d document(s) stamped with org_id=%s", total, orgID)
}
