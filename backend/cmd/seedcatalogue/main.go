// cmd/seedcatalogue — seeds the catalogue_items collection from real Gompels
// order CSVs (orders/*.csv, columns: Code, Description, Quantity, Unit Price,
// Net Price, VAT, Gross Price).
//
// One catalogue doc is created per unique Gompels code. Options embedded in the
// description ("… - Colour: Green") are split into base_name + option so the
// staff picker can group variants of the same product. Re-running is idempotent:
// rows are UPSERTED by full description (name), so admin-curated or sourcing-
// discovered items are left untouched and re-runs don't duplicate.
//
// Add more orders by dropping another CSV into orders/ and re-running:
//
//	cd backend && go run ./cmd/seedcatalogue
package main

import (
	"context"
	"embed"
	"encoding/csv"
	"io/fs"
	"log"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/blue-nest-montessori/api/internal/config"
	"github.com/blue-nest-montessori/api/internal/models"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

//go:embed orders/*.csv
var ordersFS embed.FS

// optionRe matches a trailing " - Colour: X" / " - Size: X" / " - Type: X" suffix.
var optionRe = regexp.MustCompile(`(?i)\s-\s(Colour|Color|Size|Type):\s*(.+)$`)

// packRe extracts a best-effort pack size from a description.
var packRe = regexp.MustCompile(`(?i)(\d+\s*(?:x\s*\d+)?\s*(?:Pack|Sheets|Sheet|Litre|Litres|ml|Metres|Metre|kg|g|Roll|Rolls|Pairs?))`)

type row struct {
	code, description, baseName, option, packSize string
	priceGrossPence                               int64
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
	log.Printf("Connected → db=%s", cfg.Mongo.Database)

	rows := parseOrders()
	log.Printf("Parsed %d unique Gompels products from order CSVs", len(rows))

	coll := client.Database(cfg.Mongo.Database).Collection("catalogue_items")
	now := time.Now().UTC()
	upserted := 0
	for _, r := range rows {
		offer := models.CatalogueOffer{
			Supplier:     "Gompels",
			Code:         r.code,
			PackSize:     r.packSize,
			Price:        r.priceGrossPence,
			PricePerUnit: r.priceGrossPence,
			SourceURL:    "https://www.gompels.co.uk/",
			LastSeenAt:   now,
		}
		// Upsert by full description (unique per code in our data).
		filter := bson.M{"name": bson.M{"$regex": "^" + regexp.QuoteMeta(r.description) + "$", "$options": "i"}}
		update := bson.M{
			"$set": bson.M{
				"name":       r.description,
				"base_name":  r.baseName,
				"option":     r.option,
				"offers":     []models.CatalogueOffer{offer},
				"is_active":  true,
				"updated_at": now,
			},
			"$setOnInsert": bson.M{"created_at": now},
		}
		res, err := coll.UpdateOne(ctx, filter, update, options.Update().SetUpsert(true))
		if err != nil {
			log.Fatalf("upsert %q: %v", r.code, err)
		}
		if res.UpsertedCount > 0 || res.ModifiedCount > 0 || res.MatchedCount > 0 {
			upserted++
		}
	}
	log.Printf("Upserted %d catalogue items", upserted)
}

// parseOrders reads every embedded order CSV, dedupes by code (later files win on
// price), and splits base_name/option/pack size. Returns rows sorted by name.
func parseOrders() []row {
	files, err := fs.Glob(ordersFS, "orders/*.csv")
	if err != nil {
		log.Fatalf("glob: %v", err)
	}
	sort.Strings(files) // 1.csv … 6.csv → later files overwrite earlier on price

	byCode := map[string]row{}
	for _, f := range files {
		data, err := ordersFS.ReadFile(f)
		if err != nil {
			log.Fatalf("read %s: %v", f, err)
		}
		// Strip a UTF-8 BOM if present so the first header/code parses cleanly.
		clean := strings.TrimPrefix(string(data), "\ufeff")
		recs, err := csv.NewReader(strings.NewReader(clean)).ReadAll()
		if err != nil {
			log.Fatalf("parse %s: %v", f, err)
		}
		for i, rec := range recs {
			if i == 0 || len(rec) < 7 {
				continue // header / malformed
			}
			code := strings.TrimSpace(rec[0])
			desc := strings.TrimSpace(rec[1])
			if code == "" || desc == "" {
				continue
			}
			qty, _ := strconv.Atoi(strings.TrimSpace(rec[2]))
			if qty < 1 {
				qty = 1
			}
			gross, _ := strconv.ParseFloat(strings.TrimSpace(rec[6]), 64)
			unitPence := int64((gross/float64(qty))*100 + 0.5)

			base, opt := splitOption(desc)
			byCode[code] = row{
				code:            code,
				description:     desc,
				baseName:        base,
				option:          opt,
				packSize:        packRe.FindString(desc),
				priceGrossPence: unitPence,
			}
		}
	}

	out := make([]row, 0, len(byCode))
	for _, r := range byCode {
		out = append(out, r)
	}
	sort.Slice(out, func(i, j int) bool { return out[i].description < out[j].description })
	return out
}

// splitOption separates "Base - Colour: Green" into ("Base", "Colour: Green").
// Returns (fullDescription, "") when there's no recognised option suffix.
func splitOption(desc string) (base, option string) {
	if m := optionRe.FindStringSubmatch(desc); m != nil {
		label := strings.Title(strings.ToLower(m[1])) // Colour/Size/Type
		if strings.EqualFold(m[1], "color") {
			label = "Colour"
		}
		return strings.TrimSpace(optionRe.ReplaceAllString(desc, "")), label + ": " + strings.TrimSpace(m[2])
	}
	return desc, ""
}
