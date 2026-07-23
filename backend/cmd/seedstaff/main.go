// cmd/seedstaff/main.go — idempotently seeds nursery staff + today's staff
// attendance so the MD Command Centre People tab & Staff KPIs show real figures.
//
// Run: cd backend && go run ./cmd/seedstaff   (or `make seed-staff`)
//
// DROPS and rebuilds the staff / staff_attendance collections with demo data
// matching the mock per-branch headcounts (~92 staff, ~90% present).
// Deterministic (fixed RNG seed). NEVER run this against an environment where
// cmd/seedfamly has imported a real nursery's real staff — it drops that data
// too, and seedguard.RequireDrop below refuses unless explicitly confirmed.
package main

import (
	"context"
	"fmt"
	"log"
	"math/rand"
	"time"

	"github.com/blue-nest-montessori/api/internal/config"
	"github.com/blue-nest-montessori/api/internal/models"
	"github.com/blue-nest-montessori/api/internal/platform/seedguard"
	"github.com/joho/godotenv"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// per-branch headcount (mirrors data.ts BRANCH_METRICS `staff`).
var plans = []struct {
	slug    string
	count   int
	present int // % present today
}{
	{"harrow", 22, 95},
	{"pinner", 24, 92},
	{"borehamwood", 18, 88},
	{"northwood", 9, 89},
	{"pinner-green", 19, 90},
}

// job ladder — one manager & deputy per branch, the rest room staff.
var jobTitles = []string{"Room Leader", "Early Years Practitioner", "Early Years Practitioner", "Nursery Assistant", "Apprentice Practitioner"}
var quals = []string{"Level 3 Early Years Educator", "Level 2 Early Years", "Paediatric First Aid", "Safeguarding Level 2", "SENCO", "Level 5 Leadership"}

var firstNames = []string{
	"Sarah", "Emma", "Priya", "Aisha", "Grace", "Chloe", "Hannah", "Leah",
	"Nadia", "Beth", "Farah", "Megan", "Olivia", "Amara", "Sofia", "Ruth",
	"Daniel", "James", "Tomasz", "Kwame", "Liam", "Omar", "Ben", "Raj",
}
var lastNames = []string{
	"Patel", "Smith", "Okafor", "Kaur", "Byrne", "Nowak", "Ahmed", "Bailey",
	"Cole", "Duffy", "Ellis", "Frost", "Grant", "Hussain", "Iqbal", "Jenkins",
}

func main() {
	if err := seedguard.RequireDrop("cmd/seedstaff"); err != nil {
		log.Fatal(err)
	}
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

	rng := rand.New(rand.NewSource(7)) // deterministic roster
	now := time.Now()
	today := now.Format("2006-01-02")

	staffCol := db.Collection("staff")
	attCol := db.Collection("staff_attendance")
	for _, c := range []*mongo.Collection{staffCol, attCol} {
		if err := c.Drop(ctx); err != nil {
			log.Fatalf("drop %s: %v", c.Name(), err)
		}
	}
	log.Println("Cleared staff / staff_attendance")

	var staffDocs, attDocs []interface{}
	var seq int64
	total, totalPresent := 0, 0

	for _, p := range plans {
		presentTarget := int(float64(p.count)*float64(p.present)/100.0 + 0.5)
		branchPresent := 0

		for i := 0; i < p.count; i++ {
			seq++
			fn := firstNames[rng.Intn(len(firstNames))]
			ln := lastNames[rng.Intn(len(lastNames))]

			// role ladder: first is manager, second deputy, rest from the pool.
			job := "Early Years Practitioner"
			switch i {
			case 0:
				job = "Nursery Manager"
			case 1:
				job = "Deputy Manager"
			default:
				job = jobTitles[rng.Intn(len(jobTitles))]
			}

			// staff type: mostly permanent, occasional agency / bank.
			stype := models.StaffPermanent
			switch {
			case rng.Intn(20) == 0:
				stype = models.StaffAgency
			case rng.Intn(25) == 0:
				stype = models.StaffBank
			}

			// DBS expiry spread over the next ~3 years; a few due within 90 days.
			dbsDays := 60 + rng.Intn(1000)
			if rng.Intn(14) == 0 {
				dbsDays = 15 + rng.Intn(70) // expiring soon
			}
			dbsExpiry := now.AddDate(0, 0, dbsDays).Format("2006-01-02")

			// qualifications: 1–3 from the pool (deduped).
			qset := map[string]bool{"Level 3 Early Years Educator": true}
			for n := 0; n < rng.Intn(3); n++ {
				qset[quals[rng.Intn(len(quals))]] = true
			}
			qlist := make([]string, 0, len(qset))
			for q := range qset {
				qlist = append(qlist, q)
			}

			staffID := primitive.NewObjectID()
			ref := models.FormatRef(models.RefPrefixStaff, now.Year(), seq)
			hours := 40.0
			if rng.Intn(4) == 0 {
				hours = 25 + float64(rng.Intn(3))*5
			}
			staffDocs = append(staffDocs, models.Staff{
				ID:             staffID,
				Ref:            ref,
				FirstName:      fn,
				LastName:       ln,
				Email:          fmt.Sprintf("%s.%s@bluenest.uk", fn, ln),
				Phone:          fmt.Sprintf("07%09d", rng.Intn(1000000000)),
				BranchSlug:     p.slug,
				JobTitle:       job,
				StaffType:      stype,
				Status:         models.StaffActive,
				StartDate:      now.AddDate(-1-rng.Intn(6), -rng.Intn(12), 0).Format("2006-01-02"),
				ContractHours:  hours,
				Qualifications: qlist,
				DBSNumber:      fmt.Sprintf("00%010d", rng.Intn(1000000000)),
				DBSExpiry:      dbsExpiry,
				FirstAidExpiry: now.AddDate(0, 0, 120+rng.Intn(600)).Format("2006-01-02"),
				CreatedAt:      now,
				UpdatedAt:      now,
			})

			// today's attendance.
			status := models.StaffAttPresent
			var clockIn *time.Time
			late := false
			if branchPresent < presentTarget {
				status = models.StaffAttPresent
				min := 15 + rng.Intn(60) // 07:45–08:45 mostly
				t := time.Date(now.Year(), now.Month(), now.Day(), 7, min+30, 0, 0, now.Location())
				if rng.Intn(12) == 0 { // occasional late arrival after 09:00
					t = time.Date(now.Year(), now.Month(), now.Day(), 9, 5+rng.Intn(30), 0, 0, now.Location())
					late = true
				}
				clockIn = &t
				branchPresent++
			} else {
				switch rng.Intn(4) {
				case 0:
					status = models.StaffAttLeave
				case 1:
					status = models.StaffAttTraining
				case 2:
					status = models.StaffAttSick
				default:
					status = models.StaffAttLeave
				}
			}
			att := models.StaffAttendanceRecord{
				ID:          primitive.NewObjectID(),
				StaffID:     staffID.Hex(),
				StaffName:   fn + " " + ln,
				BranchSlug:  p.slug,
				Date:        today,
				Status:      status,
				LateArrival: late,
				CreatedAt:   now,
				UpdatedAt:   now,
			}
			if clockIn != nil {
				att.ClockIn = clockIn
			}
			attDocs = append(attDocs, att)
		}
		total += p.count
		totalPresent += branchPresent
		log.Printf("  %-13s staff=%-3d present=%d", p.slug, p.count, branchPresent)
	}

	if _, err := staffCol.InsertMany(ctx, staffDocs); err != nil {
		log.Fatalf("insert staff: %v", err)
	}
	if _, err := attCol.InsertMany(ctx, attDocs); err != nil {
		log.Fatalf("insert staff attendance: %v", err)
	}

	counterName := fmt.Sprintf("%s-%d", models.CounterStaff, now.Year())
	if _, err := db.Collection("counters").UpdateOne(ctx,
		bson.M{"_id": counterName},
		bson.M{"$max": bson.M{"seq": seq}},
		options.Update().SetUpsert(true),
	); err != nil {
		log.Printf("WARN counter bump: %v", err)
	}

	log.Printf("\nSeed complete ✓  %d staff · %d attendance records", len(staffDocs), len(attDocs))
	log.Printf("  Totals: staff=%d present=%d", total, totalPresent)
}
