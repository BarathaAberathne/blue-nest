// cmd/seedtaxonomy/main.go — seeds the configurable lookup lists (taxonomy_terms)
// with sensible org-wide defaults for every organisation: the weekly session
// slots (codes am/pm/full/school — MUST match the values existing children's
// sessions already store so they keep resolving), common allergy tags and
// dietary labels.
//
// Run: cd backend && go run ./cmd/seedtaxonomy   (or the baked binary on prod)
//
// Idempotent: upserts by (org_id, branch_slug="", category, code); never drops.
// Safe to re-run and safe on prod (adds only missing defaults, leaves
// admin-added / edited terms untouched).
package main

import (
	"context"
	"log"
	"time"

	"github.com/blue-nest-montessori/api/internal/config"
	"github.com/blue-nest-montessori/api/internal/models"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type term struct {
	category, code, label, start, end string
	sort                              int
}

func defaults() []term {
	return []term{
		// Weekly session slots — codes MUST match existing child.sessions values.
		{models.TaxonomySessionType, "am", "AM (8am–1pm)", "08:00", "13:00", 1},
		{models.TaxonomySessionType, "pm", "PM (1pm–6pm)", "13:00", "18:00", 2},
		{models.TaxonomySessionType, "full", "Full day (8am–6pm)", "08:00", "18:00", 3},
		{models.TaxonomySessionType, "school", "School day (9am–4pm)", "09:00", "16:00", 4},
		// Common allergy tags.
		{models.TaxonomyAllergyType, "peanuts", "Peanuts", "", "", 1},
		{models.TaxonomyAllergyType, "tree_nuts", "Tree nuts", "", "", 2},
		{models.TaxonomyAllergyType, "dairy", "Dairy", "", "", 3},
		{models.TaxonomyAllergyType, "eggs", "Eggs", "", "", 4},
		{models.TaxonomyAllergyType, "gluten", "Gluten", "", "", 5},
		{models.TaxonomyAllergyType, "soya", "Soya", "", "", 6},
		{models.TaxonomyAllergyType, "fish", "Fish", "", "", 7},
		{models.TaxonomyAllergyType, "shellfish", "Shellfish", "", "", 8},
		{models.TaxonomyAllergyType, "sesame", "Sesame", "", "", 9},
		// Common dietary labels.
		{models.TaxonomyDietaryLabel, "vegetarian", "Vegetarian", "", "", 1},
		{models.TaxonomyDietaryLabel, "vegan", "Vegan", "", "", 2},
		{models.TaxonomyDietaryLabel, "halal", "Halal", "", "", 3},
		{models.TaxonomyDietaryLabel, "kosher", "Kosher", "", "", 4},
		{models.TaxonomyDietaryLabel, "dairy_free", "Dairy-free", "", "", 5},
		{models.TaxonomyDietaryLabel, "gluten_free", "Gluten-free", "", "", 6},
		{models.TaxonomyDietaryLabel, "no_pork", "No pork", "", "", 7},
		{models.TaxonomyDietaryLabel, "nut_free", "Nut-free", "", "", 8},
		// SEND broad areas — the four statutory EYFS/SEND Code of Practice
		// categories; orgs customise the list at /admin/lists.
		{models.TaxonomySendCategory, "communication_interaction", "Communication and interaction", "", "", 1},
		{models.TaxonomySendCategory, "cognition_learning", "Cognition and learning", "", "", 2},
		{models.TaxonomySendCategory, "semh", "Social, emotional and mental health", "", "", 3},
		{models.TaxonomySendCategory, "sensory_physical", "Sensory and/or physical needs", "", "", 4},
	}
}

// ageGroup is one default age band. Bounds in months; max 0 = unbounded top.
type ageGroup struct {
	code, label    string
	min, max, sort int
}

// ageDefaults reproduce the previous hardcoded child-stats buckets EXACTLY so
// existing figures are unchanged: Under 2 = <24m, 2–3 years = 24–36m, 3+ = 36m+.
func ageDefaults() []ageGroup {
	return []ageGroup{
		{"under_2", "Under 2", 0, 24, 1},
		{"2_3", "2–3 years", 24, 36, 2},
		{"3_plus", "3+ years", 36, 0, 3},
	}
}

func main() {
	cfg := config.Load()
	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	client, err := mongo.Connect(ctx, options.Client().ApplyURI(cfg.Mongo.URI))
	if err != nil {
		log.Fatalf("connect: %v", err)
	}
	defer func() { _ = client.Disconnect(ctx) }()
	if err = client.Ping(ctx, nil); err != nil {
		log.Fatalf("ping: %v", err)
	}
	db := client.Database(cfg.Mongo.Database)
	log.Printf("Connected → db=%s", cfg.Mongo.Database)

	// Resolve every organisation — defaults are seeded org-wide per tenant so the
	// org-scoped reads (which filter by org_id) find them.
	orgCur, err := db.Collection("organisations").Find(ctx, bson.M{})
	if err != nil {
		log.Fatalf("load organisations: %v", err)
	}
	var orgs []bson.M
	if err := orgCur.All(ctx, &orgs); err != nil {
		log.Fatalf("decode organisations: %v", err)
	}
	if len(orgs) == 0 {
		log.Fatalf("no organisations found — restore the baseline (make baseline-reset) or create the default org first")
	}

	coll := db.Collection("taxonomy_terms")
	now := time.Now()
	var inserted, kept int
	for _, org := range orgs {
		oid, ok := org["_id"].(primitive.ObjectID)
		if !ok {
			continue
		}
		orgID := oid.Hex()
		for _, t := range defaults() {
			filter := bson.M{"org_id": orgID, "branch_slug": "", "category": t.category, "code": t.code}
			res, err := coll.UpdateOne(ctx, filter, bson.M{
				"$setOnInsert": bson.M{
					"org_id": orgID, "branch_slug": "", "category": t.category, "code": t.code,
					"label": t.label, "start_time": t.start, "end_time": t.end,
					"sort_order": t.sort, "active": true, "created_at": now, "updated_at": now,
				},
			}, options.Update().SetUpsert(true))
			if err != nil {
				log.Fatalf("upsert %s/%s: %v", t.category, t.code, err)
			}
			if res.UpsertedCount > 0 {
				inserted++
			} else {
				kept++
			}
		}
		// Age bands (carry min/max age in months instead of times).
		for _, a := range ageDefaults() {
			filter := bson.M{"org_id": orgID, "branch_slug": "", "category": models.TaxonomyAgeGroup, "code": a.code}
			res, err := coll.UpdateOne(ctx, filter, bson.M{
				"$setOnInsert": bson.M{
					"org_id": orgID, "branch_slug": "", "category": models.TaxonomyAgeGroup, "code": a.code,
					"label": a.label, "min_age_months": a.min, "max_age_months": a.max,
					"sort_order": a.sort, "active": true, "created_at": now, "updated_at": now,
				},
			}, options.Update().SetUpsert(true))
			if err != nil {
				log.Fatalf("upsert age_group/%s: %v", a.code, err)
			}
			if res.UpsertedCount > 0 {
				inserted++
			} else {
				kept++
			}
		}
	}
	log.Printf("Taxonomy seed complete ✓ orgs=%d inserted=%d kept(existing)=%d", len(orgs), inserted, kept)
}
