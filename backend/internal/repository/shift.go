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

type ShiftRepository interface {
	Create(ctx context.Context, s *models.Shift) error
	FindByBranchRange(ctx context.Context, branch, from, to string) ([]models.Shift, error)
	FindByStaffRange(ctx context.Context, staffID, from, to string) ([]models.Shift, error)
	FindByStaffDate(ctx context.Context, staffID, date string) (*models.Shift, error)
	FindByID(ctx context.Context, id string) (*models.Shift, error)
	Update(ctx context.Context, id string, s models.Shift) (*models.Shift, error)
	Delete(ctx context.Context, id string) error
}

type shiftRepository struct {
	col *TenantCollection
}

func NewShiftRepository(db *mongo.Database) ShiftRepository {
	return &shiftRepository{col: NewTenantCollection(db, "shifts")}
}

func (r *shiftRepository) Create(ctx context.Context, s *models.Shift) error {
	s.ID = primitive.NewObjectID()
	now := time.Now()
	s.CreatedAt, s.UpdatedAt = now, now
	_, err := r.col.InsertOne(ctx, s)
	return err
}

// FindByBranchRange returns shifts for a branch within [from, to] inclusive
// (dates are lexicographically comparable YYYY-MM-DD strings).
func (r *shiftRepository) FindByBranchRange(ctx context.Context, branch, from, to string) ([]models.Shift, error) {
	filter := bson.M{"branch_slug": branch, "date": bson.M{"$gte": from, "$lte": to}}
	cur, err := r.col.Find(ctx, filter, options.Find().SetSort(bson.D{{Key: "date", Value: 1}, {Key: "start_time", Value: 1}}))
	if err != nil {
		return nil, err
	}
	var out []models.Shift
	if err := cur.All(ctx, &out); err != nil {
		return nil, err
	}
	return out, nil
}

// FindByStaffRange returns a staff member's shifts within [from, to] inclusive.
func (r *shiftRepository) FindByStaffRange(ctx context.Context, staffID, from, to string) ([]models.Shift, error) {
	filter := bson.M{"staff_id": staffID, "date": bson.M{"$gte": from, "$lte": to}}
	cur, err := r.col.Find(ctx, filter, options.Find().SetSort(bson.D{{Key: "date", Value: 1}, {Key: "start_time", Value: 1}}))
	if err != nil {
		return nil, err
	}
	var out []models.Shift
	if err := cur.All(ctx, &out); err != nil {
		return nil, err
	}
	return out, nil
}

// FindByStaffDate returns the earliest shift a staff member has on a date, or
// (nil, nil) when unrostered. Used by attendance to compute late/overtime.
func (r *shiftRepository) FindByStaffDate(ctx context.Context, staffID, date string) (*models.Shift, error) {
	var s models.Shift
	err := r.col.FindOne(ctx, bson.M{"staff_id": staffID, "date": date}, options.FindOne().SetSort(bson.D{{Key: "start_time", Value: 1}})).Decode(&s)
	if errors.Is(err, mongo.ErrNoDocuments) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &s, nil
}

func (r *shiftRepository) FindByID(ctx context.Context, id string) (*models.Shift, error) {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, err
	}
	var s models.Shift
	if err := r.col.FindOne(ctx, bson.M{"_id": oid}).Decode(&s); err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return nil, errors.New("shift not found")
		}
		return nil, err
	}
	return &s, nil
}

func (r *shiftRepository) Update(ctx context.Context, id string, s models.Shift) (*models.Shift, error) {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, err
	}
	update := bson.M{"$set": bson.M{
		"room_id":    s.RoomID,
		"room_name":  s.RoomName,
		"date":       s.Date,
		"start_time": s.StartTime,
		"end_time":   s.EndTime,
		"notes":      s.Notes,
		"updated_at": time.Now(),
	}}
	opts := options.FindOneAndUpdate().SetReturnDocument(options.After)
	var out models.Shift
	if err := r.col.FindOneAndUpdate(ctx, bson.M{"_id": oid}, update, opts).Decode(&out); err != nil {
		return nil, err
	}
	return &out, nil
}

func (r *shiftRepository) Delete(ctx context.Context, id string) error {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return err
	}
	_, err = r.col.DeleteOne(ctx, bson.M{"_id": oid})
	return err
}
