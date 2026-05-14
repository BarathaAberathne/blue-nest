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
	log.Printf("Connected → %s / db=%s", cfg.Mongo.URI, cfg.Mongo.Database)

	coll := client.Database(cfg.Mongo.Database).Collection("branches")

	if err = coll.Drop(ctx); err != nil {
		log.Fatalf("drop: %v", err)
	}
	log.Println("Dropped existing branches collection")

	branches := models.SeedBranches()
	docs := make([]interface{}, len(branches))
	for i, b := range branches {
		docs[i] = b
	}

	res, err := coll.InsertMany(ctx, docs)
	if err != nil {
		log.Fatalf("insertMany: %v", err)
	}
	log.Printf("Inserted %d branches", len(res.InsertedIDs))

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
