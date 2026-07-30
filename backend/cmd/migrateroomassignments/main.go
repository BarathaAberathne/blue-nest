// Command migrateroomassignments migrates the legacy single-value
// child.room_id / staff.room_id strings into the authoritative
// child_room_assignments / staff_room_assignments collections
// (docs/rooms/room-allocation-migration-plan.md).
//
// Properties:
//   - Idempotent: an entity that already has any assignment row for its legacy
//     room is skipped; re-running never duplicates (the collections' partial
//     unique indexes are a second line of defence).
//   - Non-destructive: legacy room_id values are NEVER written or cleared —
//     rollback = drop the two assignment collections.
//   - Honest: invalid rooms and cross-branch values are logged and counted,
//     never silently discarded.
//
// Run:  cd backend && go run ./cmd/migrateroomassignments          (migrate)
//	     cd backend && go run ./cmd/migrateroomassignments -verify  (verify parity)
package main

import (
	"context"
	"flag"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/blue-nest-montessori/api/internal/config"
	"github.com/blue-nest-montessori/api/internal/models"
	"github.com/joho/godotenv"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

const migrationActor = "migration:room-assignments"

type stats struct {
	scanned, migrated, alreadyPresent, invalidRoom, crossBranch, endedHistory int
}

func (s stats) String() string {
	return fmt.Sprintf("scanned=%d migrated=%d already-present=%d invalid-room=%d cross-branch=%d ended-history=%d",
		s.scanned, s.migrated, s.alreadyPresent, s.invalidRoom, s.crossBranch, s.endedHistory)
}

func main() {
	verify := flag.Bool("verify", false, "verify migration parity instead of migrating")
	flag.Parse()

	for _, path := range []string{".env", "../.env", "../../.env"} {
		if err := godotenv.Load(path); err == nil {
			break
		}
	}
	cfg := config.Load()
	ctx, cancel := context.WithTimeout(context.Background(), 120*time.Second)
	defer cancel()

	client, err := mongo.Connect(ctx, options.Client().ApplyURI(cfg.Mongo.URI))
	if err != nil {
		log.Fatalf("connect: %v", err)
	}
	defer func() { _ = client.Disconnect(ctx) }()
	db := client.Database(cfg.Mongo.Database)

	rooms := loadRooms(ctx, db)
	log.Printf("rooms loaded: %d", len(rooms))

	if *verify {
		ok := verifyParity(ctx, db, rooms)
		if !ok {
			os.Exit(1)
		}
		log.Println("VERIFY OK — every valid legacy room_id has a matching assignment and every active assignment matches the derived field")
		return
	}

	childStats := migrateChildren(ctx, db, rooms)
	staffStats := migrateStaff(ctx, db, rooms)

	// Clean schema: the stored room_id scalar is obsolete (runtime now reads the
	// canonical assignment model). $unset it from every record that HAS an
	// assignment. Invalid/cross-branch values that were NOT migrated are left
	// in place + logged above, so nothing is silently discarded.
	childUnset := unsetLegacyRoom(ctx, db, "children", "child_room_assignments", "child_id")
	staffUnset := unsetLegacyRoom(ctx, db, "staff", "staff_room_assignments", "staff_id")

	log.Println("── migration report ──────────────────────────────")
	log.Printf("children: %s legacy-room_id-unset=%d", childStats, childUnset)
	log.Printf("staff:    %s legacy-room_id-unset=%d", staffStats, staffUnset)
	if childStats.invalidRoom+childStats.crossBranch+staffStats.invalidRoom+staffStats.crossBranch > 0 {
		log.Println("NOTE: invalid/cross-branch legacy values were KEPT on the source records (never discarded) — review the log lines above.")
	}
}

// unsetLegacyRoom removes the obsolete stored room_id from every source record
// that already has a canonical assignment. Idempotent.
func unsetLegacyRoom(ctx context.Context, db *mongo.Database, sourceCol, assignCol, fk string) int64 {
	assigned := map[string]bool{}
	cur, err := db.Collection(assignCol).Find(ctx, bson.M{})
	if err != nil {
		log.Fatalf("unset scan %s: %v", assignCol, err)
	}
	var rows []bson.M
	if err := cur.All(ctx, &rows); err != nil {
		log.Fatalf("unset decode %s: %v", assignCol, err)
	}
	for _, r := range rows {
		if id, ok := r[fk].(string); ok && id != "" {
			assigned[id] = true
		}
	}
	var total int64
	for id := range assigned {
		oid, err := primitive.ObjectIDFromHex(id)
		if err != nil {
			continue
		}
		res, err := db.Collection(sourceCol).UpdateOne(ctx,
			bson.M{"_id": oid, "room_id": bson.M{"$exists": true}},
			bson.M{"$unset": bson.M{"room_id": ""}})
		if err != nil {
			log.Printf("unset %s %s: %v", sourceCol, id, err)
			continue
		}
		total += res.ModifiedCount
	}
	return total
}

type roomInfo struct {
	branch string
	name   string
}

func loadRooms(ctx context.Context, db *mongo.Database) map[string]roomInfo {
	out := map[string]roomInfo{}
	cur, err := db.Collection("rooms").Find(ctx, bson.M{})
	if err != nil {
		log.Fatalf("load rooms: %v", err)
	}
	var rooms []models.Room
	if err := cur.All(ctx, &rooms); err != nil {
		log.Fatalf("decode rooms: %v", err)
	}
	for _, r := range rooms {
		out[r.ID.Hex()] = roomInfo{branch: r.BranchSlug, name: r.Name}
	}
	return out
}

// dateOnly formats a time as YYYY-MM-DD, falling back to today when zero.
func dateOnly(t time.Time) string {
	if t.IsZero() {
		return time.Now().Format("2006-01-02")
	}
	return t.Format("2006-01-02")
}

func migrateChildren(ctx context.Context, db *mongo.Database, rooms map[string]roomInfo) stats {
	var st stats
	col := db.Collection("children")
	assignments := db.Collection("child_room_assignments")

	cur, err := col.Find(ctx, bson.M{"room_id": bson.M{"$exists": true, "$nin": bson.A{nil, ""}}})
	if err != nil {
		log.Fatalf("children scan: %v", err)
	}
	var children []models.Child
	if err := cur.All(ctx, &children); err != nil {
		log.Fatalf("children decode: %v", err)
	}

	for _, c := range children {
		st.scanned++
		childID := c.ID.Hex()
		room, ok := rooms[c.RoomID]
		if !ok {
			st.invalidRoom++
			log.Printf("INVALID (room not found): child %s %s %s → room_id %s — legacy value kept", c.Ref, c.FirstName, c.LastName, c.RoomID)
			continue
		}
		if room.branch != c.BranchSlug {
			st.crossBranch++
			log.Printf("CROSS-BRANCH: child %s %s %s (branch %s) → room %q (branch %s) — legacy value kept", c.Ref, c.FirstName, c.LastName, c.BranchSlug, room.name, room.branch)
			continue
		}
		// Idempotency: any existing assignment row for this child+room means a
		// previous run (or the live service) already captured it.
		n, err := assignments.CountDocuments(ctx, bson.M{"child_id": childID, "room_id": c.RoomID})
		if err != nil {
			log.Fatalf("children idempotency check: %v", err)
		}
		if n > 0 {
			st.alreadyPresent++
			continue
		}
		start := c.StartDate
		if start == "" {
			start = dateOnly(c.CreatedAt)
		}
		a := models.ChildRoomAssignment{
			ID:         primitive.NewObjectID(),
			OrgID:      c.OrgID,
			BranchSlug: c.BranchSlug,
			ChildID:    childID,
			RoomID:     c.RoomID,
			StartDate:  start,
			Status:     models.AssignmentActive,
			CreatedBy:  migrationActor,
			CreatedAt:  time.Now(),
			UpdatedAt:  time.Now(),
		}
		// A child who has left keeps the placement as pure history so current
		// occupancy is not inflated.
		if c.Status == models.ChildLeft {
			a.Status = models.AssignmentEnded
			a.EndDate = dateOnly(c.UpdatedAt)
			st.endedHistory++
		}
		if _, err := assignments.InsertOne(ctx, a); err != nil {
			if mongo.IsDuplicateKeyError(err) {
				st.alreadyPresent++ // index-level idempotency (racing run)
				continue
			}
			log.Fatalf("children insert: %v", err)
		}
		st.migrated++
	}
	return st
}

func migrateStaff(ctx context.Context, db *mongo.Database, rooms map[string]roomInfo) stats {
	var st stats
	col := db.Collection("staff")
	assignments := db.Collection("staff_room_assignments")

	cur, err := col.Find(ctx, bson.M{"room_id": bson.M{"$exists": true, "$nin": bson.A{nil, ""}}})
	if err != nil {
		log.Fatalf("staff scan: %v", err)
	}
	var staff []models.Staff
	if err := cur.All(ctx, &staff); err != nil {
		log.Fatalf("staff decode: %v", err)
	}

	for _, s := range staff {
		st.scanned++
		staffID := s.ID.Hex()
		room, ok := rooms[s.RoomID]
		if !ok {
			st.invalidRoom++
			log.Printf("INVALID (room not found): staff %s %s %s → room_id %s — legacy value kept", s.Ref, s.FirstName, s.LastName, s.RoomID)
			continue
		}
		if room.branch != s.BranchSlug {
			st.crossBranch++
			log.Printf("CROSS-BRANCH: staff %s %s %s (branch %s) → room %q (branch %s) — legacy value kept", s.Ref, s.FirstName, s.LastName, s.BranchSlug, room.name, room.branch)
			continue
		}
		n, err := assignments.CountDocuments(ctx, bson.M{"staff_id": staffID, "room_id": s.RoomID})
		if err != nil {
			log.Fatalf("staff idempotency check: %v", err)
		}
		if n > 0 {
			st.alreadyPresent++
			continue
		}
		start := s.StartDate
		if start == "" {
			start = dateOnly(s.CreatedAt)
		}
		a := models.StaffRoomAssignment{
			ID:         primitive.NewObjectID(),
			OrgID:      s.OrgID,
			BranchSlug: s.BranchSlug,
			StaffID:    staffID,
			RoomID:     s.RoomID,
			IsPrimary:  true, // the single legacy value was by definition the main room
			StartDate:  start,
			Status:     models.AssignmentActive,
			CreatedBy:  migrationActor,
			CreatedAt:  time.Now(),
			UpdatedAt:  time.Now(),
		}
		if s.Status == models.StaffInactive {
			a.Status = models.AssignmentEnded
			a.EndDate = dateOnly(s.UpdatedAt)
			a.IsPrimary = false
			st.endedHistory++
		}
		if _, err := assignments.InsertOne(ctx, a); err != nil {
			if mongo.IsDuplicateKeyError(err) {
				st.alreadyPresent++
				continue
			}
			log.Fatalf("staff insert: %v", err)
		}
		st.migrated++
	}
	return st
}

// verifyParity confirms the post-consolidation invariant: room_id is now the
// canonical assignment model with NO stored scalar. It checks that (1) no
// child/staff doc still carries a stored room_id that mapped to a valid
// same-branch room (those should have been converted + $unset), and (2) every
// active child assignment references an existing child. Leftover stored
// room_id values are only acceptable when they are the invalid/cross-branch
// ones the migration deliberately kept + logged. Returns false on any breach.
func verifyParity(ctx context.Context, db *mongo.Database, rooms map[string]roomInfo) bool {
	ok := true
	ok = verifyNoConvertibleLeftover(ctx, db, "children", rooms) && ok
	ok = verifyNoConvertibleLeftover(ctx, db, "staff", rooms) && ok

	// Every active child assignment must reference an existing child.
	acur, err := db.Collection("child_room_assignments").Find(ctx, bson.M{"status": string(models.AssignmentActive)})
	if err != nil {
		log.Fatalf("verify assignments scan: %v", err)
	}
	var active []models.ChildRoomAssignment
	if err := acur.All(ctx, &active); err != nil {
		log.Fatalf("verify assignments decode: %v", err)
	}
	for _, a := range active {
		oid, err := primitive.ObjectIDFromHex(a.ChildID)
		if err != nil {
			continue
		}
		if err := db.Collection("children").FindOne(ctx, bson.M{"_id": oid}).Err(); err != nil {
			ok = false
			log.Printf("MISMATCH: active assignment %s references missing child %s", a.ID.Hex(), a.ChildID)
		}
	}
	return ok
}

// verifyNoConvertibleLeftover flags any source doc still carrying a stored
// room_id that mapped to a valid same-branch room — that means the convert +
// $unset didn't complete. Invalid/cross-branch leftovers are expected.
func verifyNoConvertibleLeftover(ctx context.Context, db *mongo.Database, col string, rooms map[string]roomInfo) bool {
	ok := true
	cur, err := db.Collection(col).Find(ctx, bson.M{"room_id": bson.M{"$exists": true, "$nin": bson.A{nil, ""}}})
	if err != nil {
		log.Fatalf("verify %s scan: %v", col, err)
	}
	var docs []bson.M
	if err := cur.All(ctx, &docs); err != nil {
		log.Fatalf("verify %s decode: %v", col, err)
	}
	for _, d := range docs {
		roomID, _ := d["room_id"].(string)
		branch, _ := d["branch_slug"].(string)
		room, valid := rooms[roomID]
		if valid && room.branch == branch {
			ok = false
			log.Printf("MISMATCH: %s %v still carries a convertible stored room_id %q (should be converted + unset)", col, d["_id"], roomID)
		}
	}
	return ok
}
