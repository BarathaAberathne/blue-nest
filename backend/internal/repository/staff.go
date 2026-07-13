package repository

import (
	"context"
	"time"

	"github.com/blue-nest-montessori/api/internal/models"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type StaffFilter struct {
	Branch string
	Status string
	Type   string
	Q      string
}

type StaffRepository interface {
	Create(ctx context.Context, s *models.Staff) error
	FindAll(ctx context.Context, f StaffFilter) ([]models.Staff, error)
	FindByID(ctx context.Context, id string) (*models.Staff, error)
	Update(ctx context.Context, id string, s models.Staff) (*models.Staff, error)
	Delete(ctx context.Context, id string) error
}

type staffRepository struct {
	col *mongo.Collection
}

func NewStaffRepository(db *mongo.Database) StaffRepository {
	return &staffRepository{col: db.Collection("staff")}
}

func (r *staffRepository) Create(ctx context.Context, s *models.Staff) error {
	s.ID = primitive.NewObjectID()
	now := time.Now()
	s.CreatedAt = now
	s.UpdatedAt = now
	_, err := r.col.InsertOne(ctx, s)
	return err
}

func (r *staffRepository) FindAll(ctx context.Context, f StaffFilter) ([]models.Staff, error) {
	filter := bson.M{}
	if f.Branch != "" {
		filter["branch_slug"] = f.Branch
	}
	if f.Status != "" {
		filter["status"] = f.Status
	}
	if f.Type != "" {
		filter["staff_type"] = f.Type
	}
	if f.Q != "" {
		filter["$or"] = bson.A{
			bson.M{"first_name": bson.M{"$regex": f.Q, "$options": "i"}},
			bson.M{"last_name": bson.M{"$regex": f.Q, "$options": "i"}},
			bson.M{"ref": bson.M{"$regex": f.Q, "$options": "i"}},
			bson.M{"job_title": bson.M{"$regex": f.Q, "$options": "i"}},
		}
	}
	opts := options.Find().SetSort(bson.D{{Key: "last_name", Value: 1}, {Key: "first_name", Value: 1}})
	cursor, err := r.col.Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	out := make([]models.Staff, 0)
	return out, cursor.All(ctx, &out)
}

func (r *staffRepository) FindByID(ctx context.Context, id string) (*models.Staff, error) {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, err
	}
	var s models.Staff
	if err = r.col.FindOne(ctx, bson.M{"_id": oid}).Decode(&s); err != nil {
		return nil, err
	}
	return &s, nil
}

func (r *staffRepository) Update(ctx context.Context, id string, s models.Staff) (*models.Staff, error) {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, err
	}
	update := bson.M{"$set": bson.M{
		"first_name":       s.FirstName,
		"last_name":        s.LastName,
		"email":            s.Email,
		"phone":            s.Phone,
		"branch_slug":      s.BranchSlug,
		"room_id":          s.RoomID,
		"job_title":        s.JobTitle,
		"staff_type":       s.StaffType,
		"status":           s.Status,
		"start_date":       s.StartDate,
		"contract_hours":   s.ContractHours,
		"qualifications":   s.Qualifications,
		"dbs_number":       s.DBSNumber,
		"dbs_expiry":       s.DBSExpiry,
		"first_aid_expiry": s.FirstAidExpiry,
		"updated_at":       time.Now(),
	}}
	opts := options.FindOneAndUpdate().SetReturnDocument(options.After)
	var out models.Staff
	if err := r.col.FindOneAndUpdate(ctx, bson.M{"_id": oid}, update, opts).Decode(&out); err != nil {
		return nil, err
	}
	return &out, nil
}

func (r *staffRepository) Delete(ctx context.Context, id string) error {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return err
	}
	_, err = r.col.DeleteOne(ctx, bson.M{"_id": oid})
	return err
}
