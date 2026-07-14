// Command backfillrefs assigns human-readable sequential references
// (SR-YYYY-NNNNNN / PO-YYYY-NNNNNN / ORD-YYYY-NNNNNN) to any supply requests,
// purchase orders and store orders created before the reference feature existed.
//
// It is idempotent: only documents missing a ref are touched, processed in
// created_at order, and each entity's per-year counter is advanced so newly
// created records continue the sequence without collision.
//
//	make backfill-refs   (or: go run ./cmd/backfillrefs)
package main

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/blue-nest-montessori/api/internal/config"
	"github.com/blue-nest-montessori/api/internal/models"
	"github.com/blue-nest-montessori/api/internal/repository"
	"github.com/joho/godotenv"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func main() {
	for _, path := range []string{".env", "../.env", "../../.env"} {
		if err := godotenv.Load(path); err == nil {
			break
		}
	}

	cfg := config.Load()
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
	counter := repository.NewCounterRepository(db)
	log.Printf("Connected → db=%s", cfg.Mongo.Database)

	targets := []struct {
		collection, counterName, prefix string
	}{
		{"order_requests", models.CounterOrderRequest, models.RefPrefixOrderRequest},
		{"purchase_carts", models.CounterPurchaseCart, models.RefPrefixPurchaseCart},
		{"orders", models.CounterOrder, models.RefPrefixOrder},
		// Children + staff imported via cmd/seedfamly are inserted directly (no
		// service ref-minting), so backfill their CHD-/STF- references here too.
		{"children", models.CounterChild, models.RefPrefixChild},
		{"staff", models.CounterStaff, models.RefPrefixStaff},
	}

	total := 0
	for _, t := range targets {
		n, err := backfill(ctx, db, counter, t.collection, t.counterName, t.prefix)
		if err != nil {
			log.Fatalf("backfill %s: %v", t.collection, err)
		}
		log.Printf("  %-16s %d ref(s) assigned", t.collection, n)
		total += n
	}
	log.Printf("\nBackfill complete ✓ (%d document(s) updated)", total)
}

func backfill(ctx context.Context, db *mongo.Database, counter repository.CounterRepository, collection, counterName, prefix string) (int, error) {
	col := db.Collection(collection)
	// Documents without a usable ref, oldest first.
	filter := bson.M{"$or": []bson.M{
		{"ref": bson.M{"$exists": false}},
		{"ref": ""},
		{"ref": nil},
	}}
	opts := options.Find().SetSort(bson.D{{Key: "created_at", Value: 1}})
	cursor, err := col.Find(ctx, filter, opts)
	if err != nil {
		return 0, err
	}
	var docs []struct {
		ID        primitive.ObjectID `bson:"_id"`
		CreatedAt time.Time          `bson:"created_at"`
	}
	if err := cursor.All(ctx, &docs); err != nil {
		return 0, err
	}

	n := 0
	for _, d := range docs {
		year := d.CreatedAt.Year()
		if year <= 1 { // missing/zero created_at — fall back to the ObjectID timestamp
			year = d.ID.Timestamp().Year()
		}
		seq, err := counter.Next(ctx, fmt.Sprintf("%s-%d", counterName, year))
		if err != nil {
			return n, err
		}
		ref := models.FormatRef(prefix, year, seq)
		if _, err := col.UpdateOne(ctx, bson.M{"_id": d.ID}, bson.M{"$set": bson.M{"ref": ref}}); err != nil {
			return n, err
		}
		n++
	}
	return n, nil
}
