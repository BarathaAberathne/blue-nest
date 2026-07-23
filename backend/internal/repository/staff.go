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

type StaffFilter struct {
	Branch string
	Status string
	Type   string
	Q      string
	Email  string // exact, case-insensitive match — used for duplicate-email checks
}

type StaffRepository interface {
	Create(ctx context.Context, s *models.Staff) error
	FindAll(ctx context.Context, f StaffFilter) ([]models.Staff, error)
	FindByID(ctx context.Context, id string) (*models.Staff, error)
	Update(ctx context.Context, id string, s models.Staff) (*models.Staff, error)
	SetPINHash(ctx context.Context, id, hash string) error
	Delete(ctx context.Context, id string) error
}

type staffRepository struct {
	col *TenantCollection
}

func NewStaffRepository(db *mongo.Database) StaffRepository {
	return &staffRepository{col: NewTenantCollection(db, "staff")}
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
		// Escaped so free-text search input is matched literally — an
		// unbalanced pattern like "(" would otherwise fail regex compilation
		// server-side and surface as a 500.
		q := regexp.QuoteMeta(f.Q)
		filter["$or"] = bson.A{
			bson.M{"first_name": bson.M{"$regex": q, "$options": "i"}},
			bson.M{"last_name": bson.M{"$regex": q, "$options": "i"}},
			bson.M{"ref": bson.M{"$regex": q, "$options": "i"}},
			bson.M{"job_title": bson.M{"$regex": q, "$options": "i"}},
		}
	}
	if f.Email != "" {
		filter["email"] = bson.M{"$regex": "^" + regexp.QuoteMeta(f.Email) + "$", "$options": "i"}
	}
	opts := options.Find().SetSort(bson.D{{Key: "last_name", Value: 1}, {Key: "first_name", Value: 1}})
	cursor, err := r.col.Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	out := make([]models.Staff, 0)
	if err := cursor.All(ctx, &out); err != nil {
		return nil, err
	}
	for i := range out {
		out[i].HasPIN = out[i].PINHash != ""
	}
	return out, nil
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
	s.HasPIN = s.PINHash != ""
	return &s, nil
}

// SetPINHash sets (or clears, when hash is empty) a staff member's kiosk PIN.
func (r *staffRepository) SetPINHash(ctx context.Context, id, hash string) error {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return err
	}
	_, err = r.col.UpdateOne(ctx, bson.M{"_id": oid}, bson.M{"$set": bson.M{"pin_hash": hash, "updated_at": time.Now()}})
	return err
}

func (r *staffRepository) Update(ctx context.Context, id string, s models.Staff) (*models.Staff, error) {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, err
	}
	update := bson.M{"$set": bson.M{
		"first_name":         s.FirstName,
		"last_name":          s.LastName,
		"email":              s.Email,
		"phone":              s.Phone,
		"branch_slug":        s.BranchSlug,
		"room_id":            s.RoomID,
		"job_title":          s.JobTitle,
		"staff_type":         s.StaffType,
		"status":             s.Status,
		"start_date":         s.StartDate,
		"contract_hours":     s.ContractHours,
		"qualifications":     s.Qualifications,
		"dbs_number":         s.DBSNumber,
		"dbs_expiry":         s.DBSExpiry,
		"first_aid_expiry":   s.FirstAidExpiry,
		"emergency_contacts": s.EmergencyContacts,
		"user_id":            s.UserID,
		"updated_at":         time.Now(),
	}}
	opts := options.FindOneAndUpdate().SetReturnDocument(options.After)
	var out models.Staff
	if err := r.col.FindOneAndUpdate(ctx, bson.M{"_id": oid}, update, opts).Decode(&out); err != nil {
		return nil, err
	}
	// Update's $set never touches pin_hash, but HasPIN is a transient
	// (bson:"-") field that only Decode-populates as its zero value — without
	// this it always comes back false right after any save, even though the
	// PIN itself is untouched (a fresh GET already computes it correctly).
	out.HasPIN = out.PINHash != ""
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
