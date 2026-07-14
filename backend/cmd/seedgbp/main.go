// cmd/seedgbp/main.go — seeds ~90 days of Google Business Profile digests +
// reviews per branch so the Reviews dashboard has trends/sentiment/keywords
// before the real Claude GBP automation is wired to the ingest webhook.
//
// Run: cd backend && go run ./cmd/seedgbp   (or `make seed-gbp`)
//
// DROPS + rebuilds branch_digests / branch_reviews and refreshes each branch's
// google.* cache. Deterministic (fixed RNG). Branches with no rating (e.g. a
// coming-soon location) are skipped.
package main

import (
	"context"
	"fmt"
	"log"
	"math/rand"
	"time"

	"github.com/blue-nest-montessori/api/internal/config"
	"github.com/blue-nest-montessori/api/internal/models"
	"github.com/joho/godotenv"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type branchLite struct {
	Slug   string  `bson:"slug"`
	Google struct {
		Rating      float64 `bson:"rating"`
		ReviewCount int     `bson:"review_count"`
	} `bson:"google"`
}

var authors = []string{
	"Sarah W.", "James P.", "Priya K.", "Emma B.", "Tom H.", "Aisha M.", "Daniel O.",
	"Chloe R.", "Mohammed A.", "Grace L.", "Ben C.", "Nadia F.", "Oliver S.", "Hannah T.",
	"Raj P.", "Sophie D.", "Leo G.", "Farah N.", "Jack W.", "Megan E.",
}
var goodTexts = []string{
	"The staff are so caring and my daughter has come on brilliantly. The Montessori approach really works.",
	"Wonderful nursery — warm, friendly practitioners and lovely outdoor space for forest school.",
	"Settling in was smooth and communication with parents is excellent. Highly recommend.",
	"My son loves it here. Great learning environment and healthy food. Fantastic progress this term.",
	"Professional, nurturing and genuinely kind team. The rooms are calm and well resourced.",
	"Brilliant Montessori setting, my little one is thriving and always excited to go in.",
}
var okTexts = []string{
	"Good nursery overall, settling took a little time but staff were supportive.",
	"Happy with the care. Would love a bit more frequent updates on the app.",
}
var badTexts = []string{
	"Communication could be better — we didn't always hear about the day. Staff are friendly though.",
	"Pick-up times can be disorganised. Hoping this improves.",
}
var keywordPool = []string{
	"caring", "montessori", "friendly", "outdoor", "forest", "learning", "settling",
	"communication", "food", "progress", "warm", "professional", "nurturing", "resources",
}

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
	log.Printf("Connected → db=%s", cfg.Mongo.Database)

	cur, err := db.Collection("branches").Find(ctx, bson.M{})
	if err != nil {
		log.Fatalf("load branches: %v", err)
	}
	var branches []branchLite
	if err := cur.All(ctx, &branches); err != nil {
		log.Fatalf("decode branches: %v", err)
	}

	rng := rand.New(rand.NewSource(23))
	now := time.Now()
	digests := db.Collection("branch_digests")
	reviews := db.Collection("branch_reviews")
	_ = digests.Drop(ctx)
	_ = reviews.Drop(ctx)

	var digestDocs, reviewDocs []interface{}
	totalReviews := 0

	for _, b := range branches {
		base := b.Google.Rating
		if base <= 0 {
			log.Printf("  – %-13s skipped (no rating)", b.Slug)
			continue
		}
		targetCount := b.Google.ReviewCount
		if targetCount < 20 {
			targetCount = 20 + rng.Intn(40)
		}
		nReviews := targetCount
		if nReviews > 30 {
			nReviews = 30 // cap the demo review list
		}

		// Reviews spread over the last 90 days, ratings weighted to the branch base.
		for i := 0; i < nReviews; i++ {
			daysAgo := rng.Intn(90)
			date := now.AddDate(0, 0, -daysAgo).Format("2006-01-02")
			rating := weightedRating(rng, base)
			var text, sentiment string
			switch {
			case rating >= 4:
				text, sentiment = goodTexts[rng.Intn(len(goodTexts))], "positive"
			case rating == 3:
				text, sentiment = okTexts[rng.Intn(len(okTexts))], "neutral"
			default:
				text, sentiment = badTexts[rng.Intn(len(badTexts))], "negative"
			}
			reply := ""
			if rng.Intn(10) < 7 { // ~70% replied
				reply = "Thank you so much for your kind words — the whole team really appreciates it!"
				if sentiment == "negative" {
					reply = "Thank you for the feedback — we've shared this with the room team and are making improvements."
				}
			}
			reviewDocs = append(reviewDocs, models.GBPReview{
				ID: primitive.NewObjectID(), BranchSlug: b.Slug,
				ReviewID: fmt.Sprintf("%s-r%03d", b.Slug, i), Author: authors[rng.Intn(len(authors))],
				Rating: rating, Text: text, Date: date, Reply: reply, Sentiment: sentiment,
				CreatedAt: now, UpdatedAt: now,
			})
			totalReviews++
		}

		// 90 daily digest snapshots (rating drifts gently toward base).
		reviewCount := targetCount - 12
		for d := 89; d >= 0; d-- {
			date := now.AddDate(0, 0, -d).Format("2006-01-02")
			rating := round1(base + (rng.Float64()-0.5)*0.2)
			if d%6 == 0 && rng.Intn(3) == 0 {
				reviewCount++
			}
			pos := 70 + rng.Intn(20)
			neg := rng.Intn(8)
			kw := make([]models.LabelCount, 0, 5)
			for k := 0; k < 5; k++ {
				kw = append(kw, models.LabelCount{Label: keywordPool[rng.Intn(len(keywordPool))], Count: 3 + rng.Intn(20)})
			}
			digestDocs = append(digestDocs, models.BranchDigest{
				ID: primitive.NewObjectID(), BranchSlug: b.Slug, Date: date, Rating: rating, ReviewCount: reviewCount,
				Insights: models.GBPInsights{
					SearchViews: 400 + rng.Intn(600), DirectionRequests: 15 + rng.Intn(40),
					Calls: 3 + rng.Intn(15), WebsiteClicks: 20 + rng.Intn(60),
					NewPhotos: rng.Intn(3), Questions: rng.Intn(2),
				},
				Keywords:  kw,
				Sentiment: models.SentimentSplit{Positive: pos, Neutral: 100 - pos - neg, Negative: neg},
				Source:    "seed", CreatedAt: now,
			})
		}

		// Refresh the branch google cache to the latest digest.
		_, _ = db.Collection("branches").UpdateOne(ctx, bson.M{"slug": b.Slug}, bson.M{"$set": bson.M{
			"google.rating": base, "google.review_count": reviewCount, "google.last_sync": now,
			"google.business_status": "OPERATIONAL",
		}})
		log.Printf("  ✓ %-13s rating=%.1f reviews=%d digests=90", b.Slug, base, nReviews)
	}

	if len(digestDocs) > 0 {
		if _, err := digests.InsertMany(ctx, digestDocs); err != nil {
			log.Fatalf("insert digests: %v", err)
		}
	}
	if len(reviewDocs) > 0 {
		if _, err := reviews.InsertMany(ctx, reviewDocs); err != nil {
			log.Fatalf("insert reviews: %v", err)
		}
	}
	log.Printf("\nSeed complete ✓  %d digests · %d reviews", len(digestDocs), totalReviews)
}

// weightedRating draws a 1–5 star rating skewed toward the branch's base rating.
func weightedRating(rng *rand.Rand, base float64) int {
	roll := rng.Float64() * 5
	if roll < base-0.6 {
		return 5
	}
	if roll < base+0.2 {
		return 4
	}
	if roll < base+0.8 {
		return 3
	}
	if rng.Intn(2) == 0 {
		return 2
	}
	return 1
}

func round1(v float64) float64 { return float64(int(v*10+0.5)) / 10 }
