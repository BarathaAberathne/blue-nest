package repository

import (
	"context"
	"errors"
	"time"

	"github.com/blue-nest-montessori/api/internal/models"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type StaffAttendanceRepository interface {
	// Upsert writes one record per (staff, date); returns the stored record.
	Upsert(ctx context.Context, rec models.StaffAttendanceRecord) (*models.StaffAttendanceRecord, error)
	FindByDate(ctx context.Context, date, branch string) ([]models.StaffAttendanceRecord, error)
	FindByStaffDate(ctx context.Context, staffID, date string) (*models.StaffAttendanceRecord, error)
	// FindByStaffRange returns a staff member's records within [from, to] inclusive.
	FindByStaffRange(ctx context.Context, staffID, from, to string) ([]models.StaffAttendanceRecord, error)
	FindByID(ctx context.Context, id string) (*models.StaffAttendanceRecord, error)
	// LatestDate returns the most recent date (YYYY-MM-DD) with any record, or
	// "" when empty. Optionally scoped to a branch.
	LatestDate(ctx context.Context, branch string) (string, error)
}

type staffAttendanceRepository struct {
	col *mongo.Collection
}

func NewStaffAttendanceRepository(db *mongo.Database) StaffAttendanceRepository {
	return &staffAttendanceRepository{col: db.Collection("staff_attendance")}
}

func (r *staffAttendanceRepository) Upsert(ctx context.Context, rec models.StaffAttendanceRecord) (*models.StaffAttendanceRecord, error) {
	now := time.Now()
	rec.UpdatedAt = now
	// Persist the full record so all attendance fields (capture context, breaks,
	// computed minutes) survive. clock_in/out are set explicitly — including nil,
	// so Mark(absent) and re-clock-in correctly clear stale times.
	set := bson.M{
		"staff_id":                rec.StaffID,
		"staff_name":              rec.StaffName,
		"branch_slug":             rec.BranchSlug,
		"date":                    rec.Date,
		"status":                  rec.Status,
		"clock_in":                rec.ClockIn,
		"clock_out":               rec.ClockOut,
		"late_arrival":            rec.LateArrival,
		"notes":                   rec.Notes,
		"source":                  rec.Source,
		"device_id":               rec.DeviceID,
		"ip":                      rec.IP,
		"location":                rec.Location,
		"created_by":              rec.CreatedBy,
		"breaks":                  rec.Breaks,
		"shift_id":                rec.ShiftID,
		"missing_clockout":        rec.MissingClockOut,
		"worked_minutes":          rec.WorkedMinutes,
		"break_minutes":           rec.BreakMinutes,
		"overtime_minutes":        rec.OvertimeMinutes,
		"late_minutes":            rec.LateMinutes,
		"early_departure_minutes": rec.EarlyDepartureMinutes,
		"corrections":             rec.Corrections,
		"updated_at":              now,
	}
	update := bson.M{"$set": set, "$setOnInsert": bson.M{"created_at": now}}
	opts := options.FindOneAndUpdate().SetUpsert(true).SetReturnDocument(options.After)
	var out models.StaffAttendanceRecord
	err := r.col.FindOneAndUpdate(ctx, bson.M{"staff_id": rec.StaffID, "date": rec.Date}, update, opts).Decode(&out)
	if err != nil {
		return nil, err
	}
	return &out, nil
}

func (r *staffAttendanceRepository) FindByDate(ctx context.Context, date, branch string) ([]models.StaffAttendanceRecord, error) {
	filter := bson.M{"date": date}
	if branch != "" {
		filter["branch_slug"] = branch
	}
	cursor, err := r.col.Find(ctx, filter)
	if err != nil {
		return nil, err
	}
	out := make([]models.StaffAttendanceRecord, 0)
	return out, cursor.All(ctx, &out)
}

func (r *staffAttendanceRepository) LatestDate(ctx context.Context, branch string) (string, error) {
	filter := bson.M{}
	if branch != "" {
		filter["branch_slug"] = branch
	}
	opts := options.FindOne().SetSort(bson.D{{Key: "date", Value: -1}}).SetProjection(bson.M{"date": 1})
	var rec models.StaffAttendanceRecord
	err := r.col.FindOne(ctx, filter, opts).Decode(&rec)
	if err == mongo.ErrNoDocuments {
		return "", nil
	}
	if err != nil {
		return "", err
	}
	return rec.Date, nil
}

func (r *staffAttendanceRepository) FindByStaffRange(ctx context.Context, staffID, from, to string) ([]models.StaffAttendanceRecord, error) {
	filter := bson.M{"staff_id": staffID, "date": bson.M{"$gte": from, "$lte": to}}
	cursor, err := r.col.Find(ctx, filter, options.Find().SetSort(bson.D{{Key: "date", Value: 1}}))
	if err != nil {
		return nil, err
	}
	out := make([]models.StaffAttendanceRecord, 0)
	return out, cursor.All(ctx, &out)
}

func (r *staffAttendanceRepository) FindByStaffDate(ctx context.Context, staffID, date string) (*models.StaffAttendanceRecord, error) {
	var rec models.StaffAttendanceRecord
	if err := r.col.FindOne(ctx, bson.M{"staff_id": staffID, "date": date}).Decode(&rec); err != nil {
		return nil, err
	}
	return &rec, nil
}

func (r *staffAttendanceRepository) FindByID(ctx context.Context, id string) (*models.StaffAttendanceRecord, error) {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, err
	}
	var rec models.StaffAttendanceRecord
	if err := r.col.FindOne(ctx, bson.M{"_id": oid}).Decode(&rec); err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return nil, errors.New("attendance record not found")
		}
		return nil, err
	}
	return &rec, nil
}
