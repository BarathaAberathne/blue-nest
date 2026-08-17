package repository

import (
	"context"
	"time"

	"github.com/blue-nest-montessori/api/internal/models"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type AttendanceRepository interface {
	// Upsert writes one record per (child, date); returns the stored record.
	Upsert(ctx context.Context, rec models.AttendanceRecord) (*models.AttendanceRecord, error)
	FindByDate(ctx context.Context, date, branch string) ([]models.AttendanceRecord, error)
	FindByChildDate(ctx context.Context, childID, date string) (*models.AttendanceRecord, error)
	FindByChild(ctx context.Context, childID string, limit int64) ([]models.AttendanceRecord, error)
	// LatestDate returns the most recent date (YYYY-MM-DD) that has any record,
	// or "" when the collection is empty. Optionally scoped to a branch.
	LatestDate(ctx context.Context, branch string) (string, error)
}

type attendanceRepository struct {
	col *TenantCollection
}

func NewAttendanceRepository(db *mongo.Database) AttendanceRepository {
	col := db.Collection("attendance")
	ensureIndexes("attendance", col,
		// Same shapes as staff_attendance: daily register reads by
		// {org, [branch,] date}, and one row per child per day as a hard
		// invariant behind the Upsert (concurrent kiosk/admin check-ins).
		mongo.IndexModel{
			Keys:    bson.D{{Key: "org_id", Value: 1}, {Key: "branch_slug", Value: 1}, {Key: "date", Value: 1}},
			Options: options.Index().SetName("idx_att_org_branch_date"),
		},
		mongo.IndexModel{
			Keys:    bson.D{{Key: "org_id", Value: 1}, {Key: "child_id", Value: 1}, {Key: "date", Value: 1}},
			Options: options.Index().SetUnique(true).SetName("uniq_att_org_child_date"),
		},
	)
	return &attendanceRepository{col: NewTenantCollectionFrom(col)}
}

func (r *attendanceRepository) Upsert(ctx context.Context, rec models.AttendanceRecord) (*models.AttendanceRecord, error) {
	now := time.Now()
	rec.UpdatedAt = now
	set := bson.M{
		"child_id":    rec.ChildID,
		"child_name":  rec.ChildName,
		"branch_slug": rec.BranchSlug,
		"room_id":     rec.RoomID,
		"date":        rec.Date,
		"status":      rec.Status,
		"late_pickup": rec.LatePickup,
		"notes":       rec.Notes,
		"updated_at":  now,
	}
	// Callers always pass a complete record (baseRecord merges the existing
	// document forward first), so a nil CheckIn/CheckOut here means the
	// caller means it — e.g. CheckIn resets a stale CheckOut on re-entry, and
	// Mark clears both when switching to absent/sick/holiday. $unset (not a
	// bare omission from $set) is required or Mongo just leaves the old value.
	unset := bson.M{}
	if rec.CheckIn != nil {
		set["check_in"] = rec.CheckIn
		set["checked_in_by"] = rec.CheckedInBy
	} else {
		unset["check_in"] = ""
		unset["checked_in_by"] = ""
	}
	if rec.CheckOut != nil {
		set["check_out"] = rec.CheckOut
		set["checked_out_by"] = rec.CheckedOutBy
	} else {
		unset["check_out"] = ""
		unset["checked_out_by"] = ""
	}
	update := bson.M{"$set": set, "$setOnInsert": bson.M{"created_at": now}}
	if len(unset) > 0 {
		update["$unset"] = unset
	}
	opts := options.FindOneAndUpdate().SetUpsert(true).SetReturnDocument(options.After)
	var out models.AttendanceRecord
	err := r.col.FindOneAndUpdate(ctx, bson.M{"child_id": rec.ChildID, "date": rec.Date}, update, opts).Decode(&out)
	if err != nil {
		return nil, err
	}
	return &out, nil
}

func (r *attendanceRepository) FindByDate(ctx context.Context, date, branch string) ([]models.AttendanceRecord, error) {
	filter := bson.M{"date": date}
	if branch != "" {
		filter["branch_slug"] = branch
	}
	cursor, err := r.col.Find(ctx, filter)
	if err != nil {
		return nil, err
	}
	out := make([]models.AttendanceRecord, 0)
	return out, cursor.All(ctx, &out)
}

func (r *attendanceRepository) FindByChildDate(ctx context.Context, childID, date string) (*models.AttendanceRecord, error) {
	var rec models.AttendanceRecord
	if err := r.col.FindOne(ctx, bson.M{"child_id": childID, "date": date}).Decode(&rec); err != nil {
		return nil, err
	}
	return &rec, nil
}

func (r *attendanceRepository) LatestDate(ctx context.Context, branch string) (string, error) {
	filter := bson.M{}
	if branch != "" {
		filter["branch_slug"] = branch
	}
	opts := options.FindOne().SetSort(bson.D{{Key: "date", Value: -1}}).SetProjection(bson.M{"date": 1})
	var rec models.AttendanceRecord
	err := r.col.FindOne(ctx, filter, opts).Decode(&rec)
	if err == mongo.ErrNoDocuments {
		return "", nil
	}
	if err != nil {
		return "", err
	}
	return rec.Date, nil
}

func (r *attendanceRepository) FindByChild(ctx context.Context, childID string, limit int64) ([]models.AttendanceRecord, error) {
	opts := options.Find().SetSort(bson.D{{Key: "date", Value: -1}}).SetLimit(limit)
	cursor, err := r.col.Find(ctx, bson.M{"child_id": childID}, opts)
	if err != nil {
		return nil, err
	}
	out := make([]models.AttendanceRecord, 0)
	return out, cursor.All(ctx, &out)
}
