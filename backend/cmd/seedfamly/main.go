// cmd/seedfamly — one-time MIGRATION importer that lifts real data out of Famly
// (the system we are replacing) into our own collections. Reads Famly CSV
// exports and UPSERTS rooms/staff/children by natural business keys (branch +
// name, plus DOB for children) — never dropping, so it is safe to re-run and,
// once reviewed, to point at production. Famly's own UUIDs are used only as
// transient join keys while parsing; nothing Famly-specific is stored — after
// migration Famly is gone. Room age ranges / ratios / capacities are derived
// from the actual children in each room, so nothing is guessed where the data
// already tells us.
//
// Run: cd backend && FAMLY_DIR=../famly-templates go run ./cmd/seedfamly
// Env: FAMLY_DIR (default ../famly-templates), DRY_RUN=1 to preview without writing.
//
// Source files (per branch harrow|pinner|borehamwood):
//   staff-<branch>.csv                                  — staff roster + rota
//   *_<branch>_child_attendance.csv                     — children + rooms + attendance
package main

import (
	"bytes"
	"context"
	"encoding/csv"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/blue-nest-montessori/api/internal/config"
	"github.com/blue-nest-montessori/api/internal/models"
	"github.com/joho/godotenv"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// exportRef is the reference "now" for deriving DOBs from Famly's ageMonths
// (the exports were taken 2026-07-14). Fixed for deterministic output.
var exportRef = time.Date(2026, 7, 1, 0, 0, 0, 0, time.UTC)

var branches = []string{"harrow", "pinner", "borehamwood"}

var dryRun = os.Getenv("DRY_RUN") == "1"

func main() {
	for _, p := range []string{".env", "../.env", "../../.env"} {
		if err := godotenv.Load(p); err == nil {
			break
		}
	}
	cfg := config.Load()
	dir := os.Getenv("FAMLY_DIR")
	if dir == "" {
		dir = "../famly-templates"
	}

	ctx, cancel := context.WithTimeout(context.Background(), 120*time.Second)
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
	log.Printf("Connected → db=%s | famly dir=%s | dry_run=%v", cfg.Mongo.Database, dir, dryRun)

	var totRooms, totStaff, totKids int
	for _, slug := range branches {
		r, s, k := seedBranch(ctx, db, dir, slug)
		totRooms += r
		totStaff += s
		totKids += k
	}
	log.Printf("DONE — rooms:%d staff:%d children:%d across %d branches%s", totRooms, totStaff, totKids, len(branches), dryLabel())
	if dryRun {
		log.Printf("(dry run — nothing written; unset DRY_RUN to apply)")
	}
}

func dryLabel() string {
	if dryRun {
		return " (dry run)"
	}
	return ""
}

// ── per-branch import ────────────────────────────────────────────────────────

type roomAgg struct {
	famlyID string
	name    string
	minM    int
	maxM    int
	kids    map[string]bool // distinct child ids seen in this room
}

func seedBranch(ctx context.Context, db *mongo.Database, dir, slug string) (int, int, int) {
	attRows := readCSV(findFile(dir, slug+"_child_attendance.csv"))
	staffRows := readCSV(findFile(dir, "staff-"+slug+".csv"))
	if attRows == nil && staffRows == nil {
		log.Printf("[%s] no source files found — skipping", slug)
		return 0, 0, 0
	}

	// 1) Rooms + children from the attendance export.
	rooms := map[string]*roomAgg{} // groupId -> agg
	type kid struct {
		famlyID, name, groupID string
		months                 int
	}
	kids := map[string]kid{} // childId -> kid (dedup by id)
	for _, r := range attRows {
		gid, gname := r["groupId"], strings.TrimSpace(r["group"])
		if gid != "" && gname != "" {
			ra := rooms[gid]
			if ra == nil {
				ra = &roomAgg{famlyID: gid, name: gname, minM: 1 << 30, maxM: -1, kids: map[string]bool{}}
				rooms[gid] = ra
			}
		}
		cid, cname := r["childId"], strings.TrimSpace(r["child"])
		if cid == "" || cname == "" {
			continue
		}
		months, _ := strconv.Atoi(strings.TrimSpace(r["ageMonths"]))
		if _, seen := kids[cid]; !seen {
			kids[cid] = kid{famlyID: cid, name: cname, groupID: gid, months: months}
		}
		if ra := rooms[gid]; ra != nil {
			ra.kids[cid] = true
			if months > 0 {
				if months < ra.minM {
					ra.minM = months
				}
				if months > ra.maxM {
					ra.maxM = months
				}
			}
		}
	}

	// Upsert rooms; keep groupId -> our room _id hex for child/staff linking.
	roomIDByGroup := map[string]string{}
	roomIDByName := map[string]string{}
	for _, ra := range rooms {
		ageRange, ratio, capacity := roomProfile(ra)
		id := upsertRoom(ctx, db, slug, ra, ageRange, ratio, capacity)
		roomIDByGroup[ra.famlyID] = id
		roomIDByName[normRoom(ra.name)] = id
	}

	// 2) Children.
	for _, k := range kids {
		first, last := splitName(k.name)
		upsertChild(ctx, db, slug, first, last, dobFromMonths(k.months), roomIDByGroup[k.groupID])
	}

	// 3) Staff from the roster export (dedup by Employee ID).
	staffSeen := map[string]bool{}
	staffCount := 0
	for _, r := range staffRows {
		eid := strings.TrimSpace(r["Employee ID"])
		name := strings.TrimSpace(r["Staff name"])
		if name == "" || staffSeen[eid] {
			continue
		}
		staffSeen[eid] = true
		first, last := splitName(name)
		roomID := roomIDByName[normRoom(strings.TrimSpace(r["Room"]))]
		upsertStaff(ctx, db, slug, first, last, strings.TrimSpace(r["Job title"]), roomID)
		staffCount++
	}

	log.Printf("[%s] rooms:%d children:%d staff:%d", slug, len(rooms), len(kids), staffCount)
	return len(rooms), staffCount, len(kids)
}

// ── upserts (idempotent by natural business key) ─────────────────────────────

func upsertRoom(ctx context.Context, db *mongo.Database, slug string, ra *roomAgg, ageRange string, ratio, capacity int) string {
	filter := bson.M{"branch_slug": slug, "name": ra.name}
	now := time.Now()
	set := bson.M{"branch_slug": slug, "name": ra.name,
		"age_range": ageRange, "staff_ratio": ratio, "capacity": capacity, "updated_at": now}
	return upsert(ctx, db.Collection("rooms"), filter, set, now)
}

func upsertChild(ctx context.Context, db *mongo.Database, slug, first, last, dob, roomID string) {
	// Natural key for a one-time migration: name + DOB within a branch.
	filter := bson.M{"branch_slug": slug, "first_name": first, "last_name": last, "dob": dob}
	now := time.Now()
	set := bson.M{"first_name": first, "last_name": last, "dob": dob,
		"branch_slug": slug, "status": string(models.ChildActive), "funding_type": "none", "updated_at": now}
	if roomID != "" {
		set["room_id"] = roomID
	}
	upsert(ctx, db.Collection("children"), filter, set, now)
}

func upsertStaff(ctx context.Context, db *mongo.Database, slug, first, last, jobTitle, roomID string) {
	filter := bson.M{"branch_slug": slug, "first_name": first, "last_name": last}
	now := time.Now()
	set := bson.M{"first_name": first, "last_name": last,
		"branch_slug": slug, "job_title": jobTitle, "staff_type": string(models.StaffPermanent),
		"status": string(models.StaffActive), "updated_at": now}
	if roomID != "" {
		set["room_id"] = roomID
	}
	upsert(ctx, db.Collection("staff"), filter, set, now)
}

// upsert applies $set + $setOnInsert(created_at); returns the doc _id hex.
func upsert(ctx context.Context, col *mongo.Collection, filter, set bson.M, now time.Time) string {
	if dryRun {
		var existing struct {
			ID any `bson:"_id"`
		}
		_ = col.FindOne(ctx, filter).Decode(&existing)
		if oid, ok := existing.ID.(interface{ Hex() string }); ok {
			return oid.Hex()
		}
		return ""
	}
	update := bson.M{"$set": set, "$setOnInsert": bson.M{"created_at": now}}
	opts := options.FindOneAndUpdate().SetUpsert(true).SetReturnDocument(options.After)
	var out struct {
		ID any `bson:"_id"`
	}
	if err := col.FindOneAndUpdate(ctx, filter, update, opts).Decode(&out); err != nil {
		log.Printf("  upsert %s failed: %v", col.Name(), err)
		return ""
	}
	if oid, ok := out.ID.(interface{ Hex() string }); ok {
		return oid.Hex()
	}
	return ""
}

// ── heuristics (data-driven where possible) ──────────────────────────────────

// roomProfile derives an age range + EYFS staff ratio + a starting capacity from
// the real ages of children currently in the room. Falls back to sane defaults
// when a room has no dated children yet. All are editable in the admin UI.
func roomProfile(ra *roomAgg) (ageRange string, ratio, capacity int) {
	capacity = len(ra.kids)
	if ra.maxM < 0 { // no ages — generic pre-school defaults
		return "", 8, max(capacity, 20)
	}
	yrs := func(m int) string {
		if m < 24 {
			return fmt.Sprintf("%dm", m)
		}
		return fmt.Sprintf("%dy", m/12)
	}
	ageRange = yrs(ra.minM) + "–" + yrs(ra.maxM)
	switch {
	case ra.maxM < 24: // under 2s
		ratio, capacity = 3, max(capacity, 9)
	case ra.maxM < 36: // 2–3s
		ratio, capacity = 5, max(capacity, 16)
	default: // 3–5s
		ratio, capacity = 8, max(capacity, 24)
	}
	return ageRange, ratio, capacity
}

func dobFromMonths(months int) string {
	if months <= 0 {
		return ""
	}
	return exportRef.AddDate(0, -months, 0).Format("2006-01-02")
}

// splitName → (first, rest-as-last). Handles multi-word surnames simply.
func splitName(full string) (string, string) {
	parts := strings.Fields(strings.TrimSpace(full))
	if len(parts) == 0 {
		return "", ""
	}
	if len(parts) == 1 {
		return parts[0], ""
	}
	return parts[0], strings.Join(parts[1:], " ")
}

func normRoom(s string) string { return strings.ToLower(strings.TrimSpace(s)) }

func max(a, b int) int {
	if a > b {
		return a
	}
	return b
}

// ── CSV plumbing ─────────────────────────────────────────────────────────────

// findFile returns the first file in dir whose name contains suffix (case-insens).
func findFile(dir, suffix string) string {
	entries, err := os.ReadDir(dir)
	if err != nil {
		return ""
	}
	suffix = strings.ToLower(suffix)
	for _, e := range entries {
		if strings.Contains(strings.ToLower(e.Name()), suffix) {
			return filepath.Join(dir, e.Name())
		}
	}
	return ""
}

// readCSV reads a (possibly BOM-prefixed) CSV into a slice of header→value maps.
func readCSV(path string) []map[string]string {
	if path == "" {
		return nil
	}
	raw, err := os.ReadFile(path)
	if err != nil {
		log.Printf("  read %s: %v", path, err)
		return nil
	}
	raw = bytes.TrimPrefix(raw, []byte{0xEF, 0xBB, 0xBF}) // strip UTF-8 BOM
	rd := csv.NewReader(bytes.NewReader(raw))
	rd.FieldsPerRecord = -1
	records, err := rd.ReadAll()
	if err != nil || len(records) < 2 {
		log.Printf("  parse %s: %v", path, err)
		return nil
	}
	head := records[0]
	out := make([]map[string]string, 0, len(records)-1)
	for _, rec := range records[1:] {
		m := make(map[string]string, len(head))
		for i, h := range head {
			if i < len(rec) {
				m[strings.TrimSpace(h)] = rec[i]
			}
		}
		out = append(out, m)
	}
	return out
}
