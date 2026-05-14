// cmd/makeadmin/main.go — promotes a user to admin by email.
// Run: cd backend && go run ./cmd/makeadmin/main.go admin@bluenest.uk
package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/joho/godotenv"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func main() {
	if len(os.Args) < 2 {
		log.Fatal("usage: go run ./cmd/makeadmin/main.go <email>")
	}
	email := os.Args[1]

	_ = godotenv.Load()
	uri := os.Getenv("MONGODB_URI")
	if uri == "" {
		uri = "mongodb://localhost:27017"
	}
	dbName := os.Getenv("MONGODB_DATABASE")
	if dbName == "" {
		dbName = "blue_nest_montessori"
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	client, err := mongo.Connect(ctx, options.Client().ApplyURI(uri))
	if err != nil {
		log.Fatal(err)
	}
	defer func() { _ = client.Disconnect(ctx) }()

	res, err := client.Database(dbName).Collection("users").UpdateOne(ctx,
		bson.M{"email": email},
		bson.M{"$set": bson.M{"role": "admin", "updated_at": time.Now()}},
	)
	if err != nil {
		log.Fatal(err)
	}
	if res.MatchedCount == 0 {
		fmt.Printf("no user found with email %s\n", email)
		os.Exit(1)
	}
	fmt.Printf("✓ %s is now admin\n", email)
}
