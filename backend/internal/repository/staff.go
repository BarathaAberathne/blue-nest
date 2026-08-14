package repository

import (
	"context"
	"log/slog"
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
	SetPhoto(ctx context.Context, id, url string) (*models.Staff, error)
	// FindByUserID resolves the staff record a login account belongs to (nil,
	// err when the user is not any staff member's login).
	FindByUserID(ctx context.Context, userID string) (*models.Staff, error)
	SetPINHash(ctx context.Context, id, hash string) error
	Delete(ctx context.Context, id string) error
}

type staffRepository struct {
	col *TenantCollection
}

func NewStaffRepository(db *mongo.Database) StaffRepository {
	col := db.Collection("staff")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	// FindByUserID backs every "which staff record is this login?" resolution
	// (My Profile, self-service leave) — indexed per org so it never scans.
	if _, err := col.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys:    bson.D{{Key: "org_id", Value: 1}, {Key: "user_id", Value: 1}},
		Options: options.Index().SetName("idx_staff_user_per_org"),
	}); err != nil {
		slog.Warn("staff: could not create {org_id, user_id} index", "err", err)
	}
	return &staffRepository{col: NewTenantCollectionFrom(col)}
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

func (r *staffRepository) SetPhoto(ctx context.Context, id, url string) (*models.Staff, error) {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, err
	}
	update := bson.M{"$set": bson.M{"updated_at": time.Now()}}
	if url == "" {
		update["$unset"] = bson.M{"photo_url": ""}
	} else {
		update["$set"].(bson.M)["photo_url"] = url
	}
	opts := options.FindOneAndUpdate().SetReturnDocument(options.After)
	var out models.Staff
	if err := r.col.FindOneAndUpdate(ctx, bson.M{"_id": oid}, update, opts).Decode(&out); err != nil {
		return nil, err
	}
	return &out, nil
}

func (r *staffRepository) FindByUserID(ctx context.Context, userID string) (*models.Staff, error) {
	if userID == "" {
		// Staff without a system login store user_id "" — an empty lookup must
		// never resolve to one of them.
		return nil, mongo.ErrNoDocuments
	}
	var out models.Staff
	if err := r.col.FindOne(ctx, bson.M{"user_id": userID}).Decode(&out); err != nil {
		return nil, err
	}
	out.HasPIN = out.PINHash != ""
	return &out, nil
}
