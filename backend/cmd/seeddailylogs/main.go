// cmd/seeddailylogs/main.go — idempotently seeds practitioner daily records
// (observations, incidents, safeguarding, medication, meals) so the MD Command
// Centre Operations tiles + Safeguarding KPI + Ofsted show real figures.
//
// Run: cd backend && go run ./cmd/seeddailylogs   (or `make seed-daily`)
//
// DROPS and rebuilds the daily_records collection. Counts match the mock tiles:
// safeguarding 2 open · incidents 1 today · medication 5 due · meals 386 served.
// Links each record to a real seeded child. Deterministic (fixed RNG seed).
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

type childLite struct {
	ID         primitive.ObjectID `bson:"_id"`
	FirstName  string             `bson:"first_name"`
	LastName   string             `bson:"last_name"`
	BranchSlug string             `bson:"branch_slug"`
	RoomID     string             `bson:"room_id"`
}

var eyfsAreas = []string{
	"Communication & Language", "Physical Development", "PSED", "Literacy",
	"Mathematics", "Understanding the World", "Expressive Arts & Design",
}
var obsTitles = []string{
	"Independent mark-making", "Cooperative role play", "Counting to 20",
	"Balancing on the beam", "Sharing at snack time", "Retelling a story",
	"Building a tall tower", "Exploring water play", "Naming shapes",
}
var meds = []struct{ name, dose string }{
	{"Calpol (paracetamol)", "5ml"}, {"Piriton", "2.5ml"}, {"Inhaler (salbutamol)", "2 puffs"},
	{"Ibuprofen", "5ml"}, {"Antibiotics (amoxicillin)", "5ml"},
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

	// Load seeded children to link records against.
	cur, err := db.Collection("children").Find(ctx, bson.M{"status": "active"})
	if err != nil {
		log.Fatalf("load children: %v", err)
	}
	var kids []childLite
	if err := cur.All(ctx, &kids); err != nil {
		log.Fatalf("decode children: %v", err)
	}
	if len(kids) == 0 {
		log.Fatal("no children found — run `make seed-children` first")
	}
	log.Printf("Loaded %d children", len(kids))

	rng := rand.New(rand.NewSource(11))
	now := time.Now()
	today := now.Format("2006-01-02")

	col := db.Collection("daily_records")
	if err := col.Drop(ctx); err != nil {
		log.Fatalf("drop: %v", err)
	}

	var docs []interface{}
	var seq int64
	pick := func() childLite { return kids[rng.Intn(len(kids))] }
	add := func(rec models.DailyRecord) {
		seq++
		rec.ID = primitive.NewObjectID()
		rec.Ref = models.FormatRef(models.RefPrefixDailyRecord, now.Year(), seq)
		rec.CreatedAt = now
		rec.UpdatedAt = now
		docs = append(docs, rec)
	}

	// Prefer Borehamwood children for safeguarding (matches the mock risk line).
	boreham := make([]childLite, 0)
	for _, k := range kids {
		if k.BranchSlug == "borehamwood" {
			boreham = append(boreham, k)
		}
	}
	sgPick := func() childLite {
		if len(boreham) > 0 {
			return boreham[rng.Intn(len(boreham))]
		}
		return pick()
	}

	// 2 open safeguarding concerns.
	for i := 0; i < 2; i++ {
		c := sgPick()
		add(models.DailyRecord{
			Type: models.RecSafeguarding, ChildID: c.ID.Hex(), ChildName: c.FirstName + " " + c.LastName,
			BranchSlug: c.BranchSlug, RoomID: c.RoomID, Date: now.AddDate(0, 0, -rng.Intn(3)).Format("2006-01-02"),
			Title: []string{"Unexplained mark observed", "Disclosure noted at pick-up"}[i%2],
			Detail: "Recorded by practitioner; DSL informed. Awaiting review.",
			Status: models.RecOpen, Severity: []string{"medium", "high"}[i%2], Author: "seed@bluenest.uk",
		})
	}

	// 1 incident today.
	{
		c := pick()
		add(models.DailyRecord{
			Type: models.RecIncident, ChildID: c.ID.Hex(), ChildName: c.FirstName + " " + c.LastName,
			BranchSlug: c.BranchSlug, RoomID: c.RoomID, Date: today,
			Title: "Minor trip in garden", Detail: "Grazed knee, cleaned & plaster applied. Parent notified.",
			Status: models.RecOpen, Severity: "low", Author: "seed@bluenest.uk",
		})
	}

	// 5 medication due today.
	for i := 0; i < 5; i++ {
		c := pick()
		m := meds[i%len(meds)]
		add(models.DailyRecord{
			Type: models.RecMedication, ChildID: c.ID.Hex(), ChildName: c.FirstName + " " + c.LastName,
			BranchSlug: c.BranchSlug, RoomID: c.RoomID, Date: today,
			Title: m.name, Medication: m.name, Dose: m.dose,
			Detail: "Consent form on file. Due midday.", Status: models.RecOpen, Author: "seed@bluenest.uk",
		})
	}

	// 386 meals served today (lunch).
	mealCount := 386
	if mealCount > len(kids) {
		mealCount = len(kids)
	}
	perm := rng.Perm(len(kids))
	eaten := []string{"all", "most", "some", "none"}
	for i := 0; i < mealCount; i++ {
		c := kids[perm[i]]
		add(models.DailyRecord{
			Type: models.RecMeal, ChildID: c.ID.Hex(), ChildName: c.FirstName + " " + c.LastName,
			BranchSlug: c.BranchSlug, RoomID: c.RoomID, Date: today,
			Title: "Lunch", MealType: "lunch", Eaten: eaten[rng.Intn(len(eaten)*3/2)%len(eaten)],
			Status: models.RecLogged, Author: "seed@bluenest.uk",
		})
	}

	// ~48 observations across the last 7 days.
	for i := 0; i < 48; i++ {
		c := pick()
		areas := []string{eyfsAreas[rng.Intn(len(eyfsAreas))]}
		if rng.Intn(2) == 0 {
			areas = append(areas, eyfsAreas[rng.Intn(len(eyfsAreas))])
		}
		add(models.DailyRecord{
			Type: models.RecObservation, ChildID: c.ID.Hex(), ChildName: c.FirstName + " " + c.LastName,
			BranchSlug: c.BranchSlug, RoomID: c.RoomID, Date: now.AddDate(0, 0, -rng.Intn(7)).Format("2006-01-02"),
			Title: obsTitles[rng.Intn(len(obsTitles))], Detail: "Observed during free-flow play.",
			EYFSAreas: areas, NextSteps: "Extend with a small-group activity next week.",
			Status: models.RecLogged, Author: "seed@bluenest.uk",
		})
	}

	if _, err := col.InsertMany(ctx, docs); err != nil {
		log.Fatalf("insert: %v", err)
	}
	counterName := fmt.Sprintf("%s-%d", models.CounterDailyRecord, now.Year())
	if _, err := db.Collection("counters").UpdateOne(ctx,
		bson.M{"_id": counterName}, bson.M{"$max": bson.M{"seq": seq}},
		options.Update().SetUpsert(true),
	); err != nil {
		log.Printf("WARN counter bump: %v", err)
	}

	log.Printf("\nSeed complete ✓  %d records", len(docs))
	log.Printf("  safeguarding=2 open · incidents=1 · medication=5 due · meals=%d · observations=48", mealCount)
}
