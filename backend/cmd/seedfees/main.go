// cmd/seedfees/main.go - seeds the per-branch fee/funding rules (fee_configs)
// from the canonical fee schedule, so the public fee calculator reads
// configurable data instead of a bundled frontend file.
//
// Run: cd backend && go run ./cmd/seedfees   (or `make seed-fees`)
//
// Idempotent: upserts by (org_id, branch_slug) with $setOnInsert, so it never
// overwrites rates an admin has since edited - re-running only fills gaps.
package main

import (
	"context"
	_ "embed"
	"encoding/json"
	"log"
	"time"

	"github.com/blue-nest-montessori/api/internal/config"
	"github.com/blue-nest-montessori/api/internal/models"
	"github.com/joho/godotenv"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

//go:embed fee-data.json
var feeDataJSON []byte

// feeData mirrors the canonical schedule shape.
type feeData struct {
	Branches map[string]struct {
		AgeGroups map[string]map[string]models.FeeSessionRate `json:"ageGroups"`
		EarlyBird float64                                      `json:"earlyBird"`
		StdFunded map[string]map[string]float64               `json:"stdFunded"`
	} `json:"branches"`
	Meta models.FeeMeta `json:"meta"`
}

// slugFor maps the schedule's display branch keys to canonical branch slugs.
func slugFor(key string) string {
	switch key {
	case "pinner green":
		return "pinner-green"
	default:
		return key
	}
}

func main() {
	for _, p := range []string{".env", "../.env", "../../.env"} {
		if err := godotenv.Load(p); err == nil {
			break
		}
	}
	cfg := config.Load()

	var data feeData
	if err := json.Unmarshal(feeDataJSON, &data); err != nil {
		log.Fatalf("parse fee-data.json: %v", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
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

	orgs, err := db.Collection("organisations").Find(ctx, bson.M{})
	if err != nil {
		log.Fatalf("list orgs: %v", err)
	}
	var orgDocs []bson.M
	if err := orgs.All(ctx, &orgDocs); err != nil {
		log.Fatalf("decode orgs: %v", err)
	}
	if len(orgDocs) == 0 {
		log.Fatalf("no organisations found - restore the baseline (make baseline-reset) or create the default org first")
	}

	coll := db.Collection("fee_configs")
	now := time.Now()
	var inserted, kept int
	for _, org := range orgDocs {
		oid, ok := org["_id"].(primitive.ObjectID)
		if !ok {
			continue
		}
		orgID := oid.Hex()
		for key, b := range data.Branches {
			slug := slugFor(key)
			res, err := coll.UpdateOne(ctx,
				bson.M{"org_id": orgID, "branch_slug": slug},
				bson.M{"$setOnInsert": bson.M{
					"org_id": orgID, "branch_slug": slug,
					"age_groups": b.AgeGroups, "early_bird": b.EarlyBird, "std_funded": b.StdFunded,
					"updated_at": now,
				}},
				options.Update().SetUpsert(true),
			)
			if err != nil {
				log.Fatalf("upsert %s: %v", slug, err)
			}
			if res.UpsertedCount > 0 {
				inserted++
			} else {
				kept++
			}
		}
		// Org-wide meta on the ""-branch doc.
		res, err := coll.UpdateOne(ctx,
			bson.M{"org_id": orgID, "branch_slug": ""},
			bson.M{"$setOnInsert": bson.M{"org_id": orgID, "branch_slug": "", "meta": data.Meta, "updated_at": now}},
			options.Update().SetUpsert(true),
		)
		if err != nil {
			log.Fatalf("upsert meta: %v", err)
		}
		if res.UpsertedCount > 0 {
			inserted++
		} else {
			kept++
		}
	}
	log.Printf("Fee config seed complete ✓ orgs=%d inserted=%d kept(existing)=%d", len(orgDocs), inserted, kept)
}
