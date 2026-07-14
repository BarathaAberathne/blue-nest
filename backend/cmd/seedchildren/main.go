// cmd/seedchildren/main.go — idempotently seeds nursery rooms, enrolled
// children and today's attendance so the MD Command Centre shows real figures.
//
// Run: cd backend && go run ./cmd/seedchildren   (or `make seed-children`)
//
// It DROPS and rebuilds the rooms / children / attendance collections (demo
// data only — no real family records exist yet), matching the approved mock
// counts per branch (~512 children, ~92% occupancy). Deterministic (fixed RNG
// seed) so re-runs produce the same roster.
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

// per-branch target roster (mirrors data.ts BRANCH_METRICS).
type branchPlan struct {
	slug      string
	children  int
	occupancy int // percent → capacity = children / occupancy
	present   int // attendanceToday percent
}

var plans = []branchPlan{
	{"harrow", 128, 95, 96},
	{"pinner", 142, 94, 94},
	{"borehamwood", 96, 93, 91},
	{"northwood", 44, 88, 88},
	{"pinner-green", 102, 90, 92},
}

// four rooms per branch by age band; the weights split a branch's children
// across them (sum = 1.0). Age band drives each child's DOB.
type roomBand struct {
	name     string
	ageRange string
	ratio    int
	minAge   int // months
	maxAge   int // months
	weight   float64
}

var bands = []roomBand{
	{"Nest (Babies)", "3–24 months", 3, 3, 23, 0.18},
	{"Toddlers", "2–3 years", 4, 24, 35, 0.28},
	{"Pre-school", "3–4 years", 8, 36, 47, 0.30},
	{"Kindergarten", "4–5 years", 8, 48, 60, 0.24},
}

var firstNames = []string{
	"Olivia", "Noah", "Amelia", "Arthur", "Isla", "Muhammad", "Ava", "Leo",
	"Freya", "Oliver", "Sophia", "George", "Lily", "Theo", "Grace", "Jack",
	"Mia", "Harry", "Ivy", "Charlie", "Aria", "Oscar", "Rosie", "Henry",
	"Zara", "Alfie", "Maya", "Finley", "Elsie", "Ethan", "Aisha", "Reuben",
	"Nina", "Rory", "Priya", "Idris", "Yusuf", "Hannah", "Emily", "Dev",
}

var lastNames = []string{
	"Smith", "Patel", "Jones", "Khan", "Williams", "Ahmed", "Taylor", "Brown",
	"Singh", "Wilson", "Evans", "Roberts", "Shah", "Clarke", "Hughes", "Wright",
	"Green", "Baker", "Ali", "Cooper", "Ward", "Morgan", "Kaur", "Bennett",
}

var relations = []string{"Mother", "Father", "Guardian"}

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

	rng := rand.New(rand.NewSource(42)) // deterministic roster
	now := time.Now()
	today := now.Format("2006-01-02")

	roomsCol := db.Collection("rooms")
	childrenCol := db.Collection("children")
	attCol := db.Collection("attendance")
	for _, c := range []*mongo.Collection{roomsCol, childrenCol, attCol} {
		if err := c.Drop(ctx); err != nil {
			log.Fatalf("drop %s: %v", c.Name(), err)
		}
	}
	log.Println("Cleared rooms / children / attendance")

	var roomDocs, childDocs, attDocs []interface{}
	var seq int64
	totalChildren, totalCapacity, totalPresent := 0, 0, 0

	for _, p := range plans {
		capacity := int(float64(p.children)/(float64(p.occupancy)/100.0) + 0.5)
		// distribute capacity across the four rooms by weight.
		remainingCap := capacity
		remainingKids := p.children
		presentTarget := int(float64(p.children)*float64(p.present)/100.0 + 0.5)
		branchPresent := 0

		for bi, band := range bands {
			last := bi == len(bands)-1
			roomCap := int(float64(capacity)*band.weight + 0.5)
			roomKids := int(float64(p.children)*band.weight + 0.5)
			if last {
				roomCap = remainingCap
				roomKids = remainingKids
			}
			if roomCap < roomKids {
				roomCap = roomKids
			}
			remainingCap -= roomCap
			remainingKids -= roomKids

			roomID := primitive.NewObjectID()
			roomDocs = append(roomDocs, models.Room{
				ID:         roomID,
				BranchSlug: p.slug,
				Name:       band.name,
				AgeRange:   band.ageRange,
				Capacity:   roomCap,
				StaffRatio: band.ratio,
				CreatedAt:  now,
				UpdatedAt:  now,
			})
			roomHex := roomID.Hex()

			for k := 0; k < roomKids; k++ {
				seq++
				fn := firstNames[rng.Intn(len(firstNames))]
				ln := lastNames[rng.Intn(len(lastNames))]
				ageMonths := band.minAge + rng.Intn(band.maxAge-band.minAge+1)
				dob := now.AddDate(0, -ageMonths, -rng.Intn(28)).Format("2006-01-02")
				gender := "female"
				if rng.Intn(2) == 0 {
					gender = "male"
				}
				funding := "none"
				if ageMonths >= 33 {
					if rng.Intn(2) == 0 {
						funding = "30h"
					} else {
						funding = "15h"
					}
				}
				childID := primitive.NewObjectID()
				ref := models.FormatRef(models.RefPrefixChild, now.Year(), seq)
				gname := firstNames[rng.Intn(len(firstNames))] + " " + ln
				child := models.Child{
					ID:          childID,
					Ref:         ref,
					FirstName:   fn,
					LastName:    ln,
					DOB:         dob,
					Gender:      gender,
					BranchSlug:  p.slug,
					RoomID:      roomHex,
					Status:      models.ChildActive,
					StartDate:   now.AddDate(0, -rng.Intn(24), 0).Format("2006-01-02"),
					FundingType: funding,
					Guardians: []models.Guardian{{
						Name:     gname,
						Relation: relations[rng.Intn(len(relations))],
						Email:    fmt.Sprintf("%s.%s@example.com", fn, ln),
						Phone:    fmt.Sprintf("07%09d", rng.Intn(1000000000)),
						Primary:  true,
					}},
					Sessions: []models.ChildSession{
						{Day: "Mon", Type: "full"}, {Day: "Tue", Type: "full"},
						{Day: "Wed", Type: "full"}, {Day: "Thu", Type: "full"},
						{Day: "Fri", Type: "full"},
					},
					CreatedAt: now,
					UpdatedAt: now,
				}
				childDocs = append(childDocs, child)

				// today's attendance: fill up to the branch present target.
				status := models.AttAbsent
				var checkIn *time.Time
				if branchPresent < presentTarget {
					status = models.AttPresent
					t := time.Date(now.Year(), now.Month(), now.Day(), 8, 30+rng.Intn(45), 0, 0, now.Location())
					checkIn = &t
					branchPresent++
				} else if rng.Intn(3) == 0 {
					status = models.AttSick
				}
				att := models.AttendanceRecord{
					ID:         primitive.NewObjectID(),
					ChildID:    childID.Hex(),
					ChildName:  fn + " " + ln,
					BranchSlug: p.slug,
					RoomID:     roomHex,
					Date:       today,
					Status:     status,
					CreatedAt:  now,
					UpdatedAt:  now,
				}
				if checkIn != nil {
					att.CheckIn = checkIn
					att.CheckedInBy = "seed@bluenest.uk"
				}
				attDocs = append(attDocs, att)
			}
		}
		totalChildren += p.children
		totalCapacity += capacity
		totalPresent += branchPresent
		log.Printf("  %-13s children=%-3d capacity=%-3d present=%d", p.slug, p.children, capacity, branchPresent)
	}

	if _, err := roomsCol.InsertMany(ctx, roomDocs); err != nil {
		log.Fatalf("insert rooms: %v", err)
	}
	if _, err := childrenCol.InsertMany(ctx, childDocs); err != nil {
		log.Fatalf("insert children: %v", err)
	}
	if _, err := attCol.InsertMany(ctx, attDocs); err != nil {
		log.Fatalf("insert attendance: %v", err)
	}

	// keep the CHD counter ahead of the seeded refs so live-created children
	// don't collide with seeded sequence numbers.
	counterName := fmt.Sprintf("%s-%d", models.CounterChild, now.Year())
	if _, err := db.Collection("counters").UpdateOne(ctx,
		bson.M{"_id": counterName},
		bson.M{"$max": bson.M{"seq": seq}},
		options.Update().SetUpsert(true),
	); err != nil {
		log.Printf("WARN counter bump: %v", err)
	}

	occ := 0
	if totalCapacity > 0 {
		occ = int(float64(totalChildren) / float64(totalCapacity) * 100)
	}
	log.Printf("\nSeed complete ✓  %d rooms · %d children · %d attendance records", len(roomDocs), len(childDocs), len(attDocs))
	log.Printf("  Totals: children=%d capacity=%d occupancy=%d%% present=%d", totalChildren, totalCapacity, occ, totalPresent)
}
