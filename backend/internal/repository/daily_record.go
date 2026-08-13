package repository

import (
	"context"
	"regexp"
	"time"

	"github.com/blue-nest-montessori/api/internal/models"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type DailyRecordFilter struct {
	Type     string
	ChildID  string
	Branch   string
	Status   string
	Approval string // "approved" (incl. legacy) | "pending" | "rejected" | "" (any)
	Date     string // exact date (YYYY-MM-DD)
	Since    string // date >= (inclusive)
	Q        string
	Limit    int64
}

type DailyRecordRepository interface {
	Create(ctx context.Context, r *models.DailyRecord) error
	FindAll(ctx context.Context, f DailyRecordFilter) ([]models.DailyRecord, error)
	FindByID(ctx context.Context, id string) (*models.DailyRecord, error)
	Update(ctx context.Context, id string, r models.DailyRecord) (*models.DailyRecord, error)
	UpdateStatus(ctx context.Context, id string, status models.DailyRecordStatus) (*models.DailyRecord, error)
	SetApproval(ctx context.Context, id string, set bson.M) (*models.DailyRecord, error)
	// SetSharing applies the parent-visibility fields ($set/$unset maps).
	SetSharing(ctx context.Context, id string, set, unset bson.M) (*models.DailyRecord, error)
	Delete(ctx context.Context, id string) error
	Count(ctx context.Context, f DailyRecordFilter) (int, error)
}

type dailyRecordRepository struct {
	col *TenantCollection
}

func NewDailyRecordRepository(db *mongo.Database) DailyRecordRepository {
	return &dailyRecordRepository{col: NewTenantCollection(db, "daily_records")}
}

func (r *dailyRecordRepository) query(f DailyRecordFilter) bson.M {
	filter := bson.M{}
	if f.Type != "" {
		filter["type"] = f.Type
	}
	if f.ChildID != "" {
		filter["child_id"] = f.ChildID
	}
	if f.Branch != "" {
		filter["branch_slug"] = f.Branch
	}
	if f.Status != "" {
		filter["status"] = f.Status
	}
	switch f.Approval {
	case models.ApprovalApproved:
		// Approved incl. legacy records (no approval_status field).
		filter["approval_status"] = bson.M{"$nin": bson.A{models.ApprovalPending, models.ApprovalRejected}}
	case models.ApprovalPending:
		filter["approval_status"] = models.ApprovalPending
	case models.ApprovalRejected:
		filter["approval_status"] = models.ApprovalRejected
	}
	if f.Date != "" {
		filter["date"] = f.Date
	}
	if f.Since != "" {
		filter["date"] = bson.M{"$gte": f.Since}
	}
	if f.Q != "" {
		// Escaped so free-text search input is matched literally — see staff.go.
		q := regexp.QuoteMeta(f.Q)
		filter["$or"] = bson.A{
			bson.M{"title": bson.M{"$regex": q, "$options": "i"}},
			bson.M{"child_name": bson.M{"$regex": q, "$options": "i"}},
			bson.M{"ref": bson.M{"$regex": q, "$options": "i"}},
		}
	}
	return filter
}

func (r *dailyRecordRepository) Create(ctx context.Context, rec *models.DailyRecord) error {
	rec.ID = primitive.NewObjectID()
	now := time.Now()
	rec.CreatedAt = now
	rec.UpdatedAt = now
	_, err := r.col.InsertOne(ctx, rec)
	return err
}

func (r *dailyRecordRepository) FindAll(ctx context.Context, f DailyRecordFilter) ([]models.DailyRecord, error) {
	opts := options.Find().SetSort(bson.D{{Key: "date", Value: -1}, {Key: "created_at", Value: -1}})
	if f.Limit > 0 {
		opts.SetLimit(f.Limit)
	}
	cursor, err := r.col.Find(ctx, r.query(f), opts)
	if err != nil {
		return nil, err
	}
	out := make([]models.DailyRecord, 0)
	return out, cursor.All(ctx, &out)
}

func (r *dailyRecordRepository) FindByID(ctx context.Context, id string) (*models.DailyRecord, error) {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, err
	}
	var rec models.DailyRecord
	if err = r.col.FindOne(ctx, bson.M{"_id": oid}).Decode(&rec); err != nil {
		return nil, err
	}
	return &rec, nil
}

func (r *dailyRecordRepository) Update(ctx context.Context, id string, rec models.DailyRecord) (*models.DailyRecord, error) {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, err
	}
	update := bson.M{"$set": bson.M{
		"type":        rec.Type,
		"child_id":    rec.ChildID,
		"child_name":  rec.ChildName,
		"branch_slug": rec.BranchSlug,
		"room_id":     rec.RoomID,
		"date":        rec.Date,
		"title":       rec.Title,
		"detail":      rec.Detail,
		"status":      rec.Status,
		"severity":    rec.Severity,
		"eyfs_areas":  rec.EYFSAreas,
		"next_steps":  rec.NextSteps,
		"medication":  rec.Medication,
		"dose":        rec.Dose,
		"meal_type":   rec.MealType,
		"eaten":       rec.Eaten,
		"updated_at":  time.Now(),
	}}
	opts := options.FindOneAndUpdate().SetReturnDocument(options.After)
	var out models.DailyRecord
	if err := r.col.FindOneAndUpdate(ctx, bson.M{"_id": oid}, update, opts).Decode(&out); err != nil {
		return nil, err
	}
	return &out, nil
}

func (r *dailyRecordRepository) UpdateStatus(ctx context.Context, id string, status models.DailyRecordStatus) (*models.DailyRecord, error) {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, err
	}
	update := bson.M{"$set": bson.M{"status": status, "updated_at": time.Now()}}
	opts := options.FindOneAndUpdate().SetReturnDocument(options.After)
	var out models.DailyRecord
	if err := r.col.FindOneAndUpdate(ctx, bson.M{"_id": oid}, update, opts).Decode(&out); err != nil {
		return nil, err
	}
	return &out, nil
}

func (r *dailyRecordRepository) SetApproval(ctx context.Context, id string, set bson.M) (*models.DailyRecord, error) {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, err
	}
	set["updated_at"] = time.Now()
	opts := options.FindOneAndUpdate().SetReturnDocument(options.After)
	var out models.DailyRecord
	if err := r.col.FindOneAndUpdate(ctx, bson.M{"_id": oid}, bson.M{"$set": set}, opts).Decode(&out); err != nil {
		return nil, err
	}
	return &out, nil
}

func (r *dailyRecordRepository) Delete(ctx context.Context, id string) error {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return err
	}
	_, err = r.col.DeleteOne(ctx, bson.M{"_id": oid})
	return err
}

func (r *dailyRecordRepository) Count(ctx context.Context, f DailyRecordFilter) (int, error) {
	n, err := r.col.CountDocuments(ctx, r.query(f))
	return int(n), err
}

func (r *dailyRecordRepository) SetSharing(ctx context.Context, id string, set, unset bson.M) (*models.DailyRecord, error) {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, err
	}
	if set == nil {
		set = bson.M{}
	}
	set["updated_at"] = time.Now()
	update := bson.M{"$set": set}
	if len(unset) > 0 {
		update["$unset"] = unset
	}
	opts := options.FindOneAndUpdate().SetReturnDocument(options.After)
	var out models.DailyRecord
	if err := r.col.FindOneAndUpdate(ctx, bson.M{"_id": oid}, update, opts).Decode(&out); err != nil {
		return nil, err
	}
	return &out, nil
}
