// cmd/migrateparents/main.go — one-shot migration: lifts each child's legacy
// embedded guardians array into the CANONICAL Parent +
// ChildParentRelationship model (docs/features/family-onboarding-finance-plan.md
// Phase 3). Parents are deduplicated per org by email (siblings share one
// person record); guardians without an email become standalone person records.
//
// Run: cd backend && go run ./cmd/migrateparents
//
// Idempotent: a child that already has ANY relationship rows is skipped, and
// email-matched parents are reused — re-running only fills gaps. The embedded
// arrays are left in place (the child service's Guardians projection prefers
// relationships once they exist); they stop being written once the UI switches.
package main

import (
	"context"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/blue-nest-montessori/api/internal/config"
	"github.com/blue-nest-montessori/api/internal/models"
	"github.com/joho/godotenv"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func splitName(full string) (string, string) {
	parts := strings.Fields(strings.TrimSpace(full))
	if len(parts) == 0 {
		return "", ""
	}
	if len(parts) == 1 {
		return parts[0], parts[0]
	}
	return parts[0], strings.Join(parts[1:], " ")
}

// parentalRelations get parental_responsibility by default in the migration.
var parentalRelations = map[string]bool{"mother": true, "father": true, "parent": true, "guardian": true, "mum": true, "dad": true, "carer": true}

func nextRef(ctx context.Context, db *mongo.Database, year int) string {
	name := models.CounterParent + "-" + fmt.Sprint(year)
	res := db.Collection("counters").FindOneAndUpdate(ctx,
		bson.M{"_id": name},
		bson.M{"$inc": bson.M{"seq": int64(1)}},
		options.FindOneAndUpdate().SetUpsert(true).SetReturnDocument(options.After))
	var doc struct {
		Seq int64 `bson:"seq"`
	}
	if err := res.Decode(&doc); err != nil {
		return ""
	}
	return models.FormatRef(models.RefPrefixParent, year, doc.Seq)
}

func main() {
	for _, p := range []string{".env", "../.env", "../../.env"} {
		if err := godotenv.Load(p); err == nil {
			break
		}
	}
	cfg := config.Load()

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
	defer cancel()
	client, err := mongo.Connect(ctx, options.Client().ApplyURI(cfg.Mongo.URI))
	if err != nil {
		log.Fatalf("connect: %v", err)
	}
	defer func() { _ = client.Disconnect(ctx) }()
	db := client.Database(cfg.Mongo.Database)
	log.Printf("Connected → db=%s", cfg.Mongo.Database)

	children := db.Collection("children")
	parents := db.Collection("parents")
	rels := db.Collection("child_parent_relationships")
	now := time.Now()
	year := now.Year()

	cur, err := children.Find(ctx, bson.M{"guardians.0": bson.M{"$exists": true}})
	if err != nil {
		log.Fatalf("list children: %v", err)
	}
	var kids []struct {
		ID        primitive.ObjectID `bson:"_id"`
		OrgID     string             `bson:"org_id"`
		FirstName string             `bson:"first_name"`
		LastName  string             `bson:"last_name"`
		Guardians []models.Guardian  `bson:"guardians"`
	}
	if err := cur.All(ctx, &kids); err != nil {
		log.Fatalf("decode children: %v", err)
	}

	var migratedChildren, createdParents, reusedParents, createdRels, skipped int
	for _, kid := range kids {
		childID := kid.ID.Hex()
		if n, _ := rels.CountDocuments(ctx, bson.M{"child_id": childID}); n > 0 {
			skipped++
			continue
		}
		for i, g := range kid.Guardians {
			if strings.TrimSpace(g.Name) == "" {
				continue
			}
			email := strings.ToLower(strings.TrimSpace(g.Email))
			var parentID string
			if email != "" {
				var existing struct {
					ID primitive.ObjectID `bson:"_id"`
				}
				if err := parents.FindOne(ctx, bson.M{"org_id": kid.OrgID, "email": email}).Decode(&existing); err == nil {
					parentID = existing.ID.Hex()
					reusedParents++
				}
			}
			if parentID == "" {
				first, last := splitName(g.Name)
				doc := bson.M{
					"org_id": kid.OrgID, "ref": nextRef(ctx, db, year),
					"first_name": first, "last_name": last,
					"email": email, "mobile_phone": strings.TrimSpace(g.Phone),
					"created_at": now, "updated_at": now,
				}
				res, err := parents.InsertOne(ctx, doc)
				if err != nil {
					log.Printf("  ! parent insert failed for %s %s: %v", kid.FirstName, kid.LastName, err)
					continue
				}
				parentID = res.InsertedID.(primitive.ObjectID).Hex()
				createdParents++
			}
			relation := strings.ToLower(strings.TrimSpace(g.Relation))
			if relation == "" {
				relation = "guardian"
			}
			_, err := rels.InsertOne(ctx, bson.M{
				"org_id": kid.OrgID, "child_id": childID, "parent_id": parentID,
				"relationship":            relation,
				"parental_responsibility": parentalRelations[relation],
				"primary_contact":         g.Primary,
				"emergency_contact":       true,
				"authorised_collection":   parentalRelations[relation],
				"billing_contact":         g.Primary,
				"receives_communications": true,
				"lives_with_child":        g.Primary,
				"portal_access":           email != "" && parentalRelations[relation],
				"finance_access":          g.Primary,
				"priority":                i + 1,
				"created_at":              now, "updated_at": now,
			})
			if err != nil {
				if mongo.IsDuplicateKeyError(err) {
					continue // same parent appears twice in one child's array
				}
				log.Printf("  ! relationship insert failed: %v", err)
				continue
			}
			createdRels++
		}
		migratedChildren++
	}
	log.Printf("Done: %d children migrated (%d already had relationships) · %d parents created · %d reused · %d relationships",
		migratedChildren, skipped, createdParents, reusedParents, createdRels)
}
