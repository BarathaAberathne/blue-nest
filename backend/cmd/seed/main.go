// cmd/seed/main.go — seeds products exactly as defined in catalog_products.csv.
// Run: cd backend && go run ./cmd/seed/main.go
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

func img(filename string) string { return "/uploads/products/" + filename }

// Single image reused for every holiday club session.
const holidayClubImg = "holiday-club-blue-nest-montessori-harrow.jpg"

// Sizes as specified in the CSV productOptionDescription column.
var wearSizes = []string{"2 years", "3-4 years", "5-6 years"}

var products = []models.Product{
	// ── Holiday Club Harrow ───────────────────────────────────────────────────
	{
		ExternalID:  "product_a1b61257-c66c-7419-c9b0-0a73ad8f580d",
		Slug:        "holiday-club-harrow-9am-4pm",
		Name:        "Holiday Club Harrow - 9am-4pm",
		Description: "Blue Nest Montessori's Holiday Club Harrow (9am–4pm) offers a full day of engaging activities in a safe and nurturing environment. Priced at £80 this session provides a balanced mix of structured learning and creative play. Children can explore arts and crafts, participate in group games, and enjoy quiet reading time, all guided by experienced staff.",
		Price:       8000,
		Currency:    "gbp",
		Category:    "Holiday Club",
		ImageURL:    img(holidayClubImg),
		ImageURLs:   []string{img(holidayClubImg)},
		StockQty:     999,
		ReorderPoint: 100,
		IsActive:    true,
		BranchSlugs: []string{"harrow"},
	},
	{
		ExternalID:  "product_6b895486-92a9-2fd1-0b72-505bb5175d71",
		Slug:        "holiday-club-harrow-8am-6pm",
		Name:        "Holiday Club Harrow - 8am-6pm",
		Description: "Blue Nest Montessori's Holiday Club Harrow (8am–6pm) offers your child a fun and enriching way to spend the day. Priced at £92, this full-day session combines care, creativity and learning in a safe, nurturing environment. With a carefully crafted mix of indoor and outdoor activities, children are encouraged to explore, play, and grow alongside skilled and caring staff.",
		Price:       9200,
		Currency:    "gbp",
		Category:    "Holiday Club",
		ImageURL:    img(holidayClubImg),
		ImageURLs:   []string{img(holidayClubImg)},
		StockQty:     999,
		ReorderPoint: 100,
		IsActive:    true,
		BranchSlugs: []string{"harrow"},
	},
	{
		ExternalID:  "product_441e8f01-8d4b-dc30-976a-a473e118619d",
		Slug:        "holiday-club-harrow-1pm-6pm",
		Name:        "Holiday Club Harrow - 1pm-6pm",
		Description: "Blue Nest Montessori Holiday Club Harrow (1pm-6pm) is a fun-filled afternoon and early evening session priced at £53. Designed for busy parents and curious kids alike, this session offers a perfect blend of engaging activities in a safe, supportive environment.",
		Price:       5300,
		Currency:    "gbp",
		Category:    "Holiday Club",
		ImageURL:    img(holidayClubImg),
		ImageURLs:   []string{img(holidayClubImg)},
		StockQty:     999,
		ReorderPoint: 100,
		IsActive:    true,
		BranchSlugs: []string{"harrow"},
	},
	{
		ExternalID:  "product_33c96595-c379-7f60-4f9a-ddf0b16e173a",
		Slug:        "holiday-club-harrow-8am-1pm",
		Name:        "Holiday Club Harrow - 8am-1pm",
		Description: "Blue Nest Montessori Holiday Club Harrow (8am–1pm) offers a fun and engaging morning session for children, priced at £55. This session provides a safe and nurturing environment where children can explore creative activities, participate in group games, and enjoy imaginative play, all guided by experienced and caring staff.",
		Price:       5500,
		Currency:    "gbp",
		Category:    "Holiday Club",
		ImageURL:    img(holidayClubImg),
		ImageURLs:   []string{img(holidayClubImg)},
		StockQty:     999,
		ReorderPoint: 100,
		IsActive:    true,
		BranchSlugs: []string{"harrow"},
	},
	// ── Holiday Club Pinner ───────────────────────────────────────────────────
	{
		ExternalID:  "product_fc66b6ca-60b9-cfe5-c5ba-cb03c0715a8c",
		Slug:        "holiday-club-pinner-9am-4pm",
		Name:        "Holiday Club Pinner - 9am-4pm",
		Description: "Blue Nest Montessori Holiday Club Pinner (9am–4pm) offers a full day of fun, learning, and care for children. Priced at £72, this session provides a safe and engaging environment where kids can explore creative activities, participate in group games, and enjoy imaginative play, all guided by experienced, caring staff.",
		Price:       7200,
		Currency:    "gbp",
		Category:    "Holiday Club",
		ImageURL:    img(holidayClubImg),
		ImageURLs:   []string{img(holidayClubImg)},
		StockQty:     999,
		ReorderPoint: 100,
		IsActive:    true,
		BranchSlugs: []string{"pinner"},
	},
	{
		ExternalID:  "product_5d29e430-32f2-98a5-8eed-498b88a680ad",
		Slug:        "holiday-club-pinner-8am-6pm",
		Name:        "Holiday Club Pinner - 8am-6pm",
		Description: "Blue Nest Montessori Holiday Club Pinner (8am–6pm) offers a full day of engaging activities in a safe and nurturing environment. Priced at £85, this session provides a balanced mix of structured learning and creative play. Children can explore arts and crafts, participate in group games, and enjoy quiet reading time, all guided by experienced staff.",
		Price:       8500,
		Currency:    "gbp",
		Category:    "Holiday Club",
		ImageURL:    img(holidayClubImg),
		ImageURLs:   []string{img(holidayClubImg)},
		StockQty:     999,
		ReorderPoint: 100,
		IsActive:    true,
		BranchSlugs: []string{"pinner"},
	},
	{
		ExternalID:  "product_7b9bf173-f19d-66a2-42a1-5001fe214ed1",
		Slug:        "holiday-club-pinner-1pm-6pm",
		Name:        "Holiday Club Pinner - 1pm-6pm",
		Description: "Blue Nest Montessori Holiday Club Pinner (1pm-6pm) is a lively afternoon and early evening session priced at £45. Perfect for families needing reliable care during the latter half of the day, this club brings together fun, friendship and purposeful play.",
		Price:       4500,
		Currency:    "gbp",
		Category:    "Holiday Club",
		ImageURL:    img(holidayClubImg),
		ImageURLs:   []string{img(holidayClubImg)},
		StockQty:     999,
		ReorderPoint: 100,
		IsActive:    true,
		BranchSlugs: []string{"pinner"},
	},
	{
		ExternalID:  "product_d6b30993-e1cb-83be-200a-a94d406be6a9",
		Slug:        "holiday-club-pinner-8am-1pm",
		Name:        "Holiday Club Pinner - 8am-1pm",
		Description: "Blue Nest Montessori Holiday Club Pinner (8am–1pm) offers a fun and engaging morning session for children, priced at £50. This session provides a safe and nurturing environment where children can explore creative activities, participate in group games, and enjoy imaginative play, all guided by experienced and caring staff.",
		Price:       5000,
		Currency:    "gbp",
		Category:    "Holiday Club",
		ImageURL:    img(holidayClubImg),
		ImageURLs:   []string{img(holidayClubImg)},
		StockQty:     999,
		ReorderPoint: 100,
		IsActive:    true,
		BranchSlugs: []string{"pinner"},
	},
	// ── Schoolwear ────────────────────────────────────────────────────────────
	{
		ExternalID: "product_fe398509-93de-640a-2666-1a04bbafe720",
		Slug:       "book-bag",
		Name:       "Book Bag",
		Price:      1000,
		Currency:   "gbp",
		Category:   "Schoolwear",
		ImageURL:   img("blue-nest-montessori-boy-with-book-bag.jpg"),
		ImageURLs: []string{
			img("blue-nest-montessori-boy-with-book-bag.jpg"),
			img("blue-nest-uniform-girl-with-book-bag.jpg"),
		},
		StockQty:     999,
		ReorderPoint: 100,
		IsActive: true,
	},
	{
		ExternalID: "product_528448ca-79fe-6fd5-449f-1898d0604165",
		Slug:       "string-bag",
		Name:       "String Bag",
		Price:      800,
		Currency:   "gbp",
		Category:   "Schoolwear",
		ImageURL:   img("blue-nest-montessori-boy-with-drawstring-bag.jpg"),
		ImageURLs: []string{
			img("blue-nest-montessori-boy-with-drawstring-bag.jpg"),
			img("blue-nest-montessori-child-with-drawstring-bag.jpg"),
		},
		StockQty:     999,
		ReorderPoint: 100,
		IsActive: true,
	},
	{
		ExternalID: "product_8267ef34-1c24-b710-02b5-3c48d0fa2859",
		Slug:       "sweatshirt",
		Name:       "Sweatshirt",
		Price:      1700,
		Currency:   "gbp",
		Category:   "Schoolwear",
		ImageURL:   img("blue-nest-montessori-girl-in-uniform-and-beanie.jpg"),
		ImageURLs: []string{
			img("blue-nest-montessori-girl-in-uniform-and-beanie.jpg"),
			img("blue-nest-montessori-uniform-children.jpg"),
		},
		StockQty:     999,
		ReorderPoint: 100,
		IsActive: true,
		Sizes:    wearSizes,
	},
	{
		ExternalID: "product_27b6936e-10db-3e47-257a-4a80d1230507",
		Slug:       "polo-shirt",
		Name:       "Polo Shirt",
		Price:      1500,
		Currency:   "gbp",
		Category:   "Schoolwear",
		ImageURL:   img("blue-nest-montessori-uniform-polo-shirt.jpg"),
		ImageURLs: []string{
			img("blue-nest-montessori-uniform-polo-shirt.jpg"),
			img("blue-nest-uniform-two-boys-holding-hands.jpg"),
		},
		StockQty:     999,
		ReorderPoint: 100,
		IsActive: true,
		Sizes:    wearSizes,
	},
	{
		ExternalID: "product_35a0f3d1-f7f0-3e41-3380-d685ad291ba3",
		Slug:       "woolly-hat",
		Name:       "Woolly Hat",
		Price:      1000,
		Currency:   "gbp",
		Category:   "Schoolwear",
		ImageURL:   img("blue-nest-montessori-child-in-uniform-beanie.jpg"),
		ImageURLs: []string{
			img("blue-nest-montessori-child-in-uniform-beanie.jpg"),
			img("blue-nest-montessori-winter-hat-uniform.jpg"),
		},
		StockQty:     999,
		ReorderPoint: 100,
		IsActive: true,
	},
}

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

	coll := client.Database(cfg.Mongo.Database).Collection("products")

	if err = coll.Drop(ctx); err != nil {
		log.Fatalf("drop: %v", err)
	}
	log.Println("Dropped existing products collection")

	now := time.Now().UTC()
	docs := make([]interface{}, len(products))
	for i, p := range products {
		p.ID = primitive.NewObjectID()
		p.CreatedAt = now
		p.UpdatedAt = now
		docs[i] = p
	}

	res, err := coll.InsertMany(ctx, docs)
	if err != nil {
		log.Fatalf("insertMany: %v", err)
	}
	log.Printf("Inserted %d products", len(res.InsertedIDs))

	// Unique index on slug.
	_, err = coll.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys:    bson.D{{Key: "slug", Value: 1}},
		Options: options.Index().SetUnique(true),
	})
	if err != nil {
		log.Printf("WARN slug index: %v", err)
	}

	log.Println("\nSeed complete ✓")
	for _, p := range products {
		log.Printf("  %-12s  £%5.2f  imgs=%d  %s",
			p.Category, float64(p.Price)/100, len(p.ImageURLs), p.Name)
	}
}
