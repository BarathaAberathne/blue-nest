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
	return &attendanceRepository{col: NewTenantCollection(db, "attendance")}
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
	if rec.CheckIn != nil {
		set["check_in"] = rec.CheckIn
		set["checked_in_by"] = rec.CheckedInBy
	}
	if rec.CheckOut != nil {
		set["check_out"] = rec.CheckOut
		set["checked_out_by"] = rec.CheckedOutBy
	}
	update := bson.M{"$set": set, "$setOnInsert": bson.M{"created_at": now}}
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
