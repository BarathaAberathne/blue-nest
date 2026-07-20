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

type ChildFilter struct {
	Branch    string
	Room      string
	Status    string
	Q         string
	KeyPerson string // staff id — children this staff member is key person for
}

type ChildRepository interface {
	Create(ctx context.Context, c *models.Child) error
	FindAll(ctx context.Context, f ChildFilter) ([]models.Child, error)
	FindByID(ctx context.Context, id string) (*models.Child, error)
	// SetKeyPerson assigns the child's key person (empty staffID clears it).
	SetKeyPerson(ctx context.Context, id, staffID string) (*models.Child, error)
	FindByEnquiryID(ctx context.Context, enquiryID string) (*models.Child, error)
	Update(ctx context.Context, id string, c models.Child) (*models.Child, error)
	Delete(ctx context.Context, id string) error
}

type childRepository struct {
	col *TenantCollection
}

func NewChildRepository(db *mongo.Database) ChildRepository {
	return &childRepository{col: NewTenantCollection(db, "children")}
}

func (r *childRepository) Create(ctx context.Context, c *models.Child) error {
	c.ID = primitive.NewObjectID()
	now := time.Now()
	c.CreatedAt = now
	c.UpdatedAt = now
	_, err := r.col.InsertOne(ctx, c)
	return err
}

func (r *childRepository) FindAll(ctx context.Context, f ChildFilter) ([]models.Child, error) {
	filter := bson.M{}
	if f.Branch != "" {
		filter["branch_slug"] = f.Branch
	}
	if f.Room != "" {
		filter["room_id"] = f.Room
	}
	if f.Status != "" {
		filter["status"] = f.Status
	}
	if f.KeyPerson != "" {
		filter["key_person_id"] = f.KeyPerson
	}
	if f.Q != "" {
		filter["$or"] = bson.A{
			bson.M{"first_name": bson.M{"$regex": f.Q, "$options": "i"}},
			bson.M{"last_name": bson.M{"$regex": f.Q, "$options": "i"}},
			bson.M{"ref": bson.M{"$regex": f.Q, "$options": "i"}},
		}
	}
	opts := options.Find().SetSort(bson.D{{Key: "last_name", Value: 1}, {Key: "first_name", Value: 1}})
	cursor, err := r.col.Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	out := make([]models.Child, 0)
	return out, cursor.All(ctx, &out)
}

func (r *childRepository) FindByID(ctx context.Context, id string) (*models.Child, error) {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, err
	}
	var c models.Child
	if err = r.col.FindOne(ctx, bson.M{"_id": oid}).Decode(&c); err != nil {
		return nil, err
	}
	return &c, nil
}

func (r *childRepository) FindByEnquiryID(ctx context.Context, enquiryID string) (*models.Child, error) {
	var c models.Child
	if err := r.col.FindOne(ctx, bson.M{"enquiry_id": enquiryID}).Decode(&c); err != nil {
		return nil, err
	}
	return &c, nil
}

func (r *childRepository) Update(ctx context.Context, id string, c models.Child) (*models.Child, error) {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, err
	}
	update := bson.M{"$set": bson.M{
		"first_name":    c.FirstName,
		"last_name":     c.LastName,
		"dob":           c.DOB,
		"gender":        c.Gender,
		"branch_slug":   c.BranchSlug,
		"room_id":       c.RoomID,
		"status":        c.Status,
		"start_date":    c.StartDate,
		"guardians":     c.Guardians,
		"funding_type":  c.FundingType,
		"sessions":      c.Sessions,
		"allergies":     c.Allergies,
		"dietary_reqs":  c.DietaryReqs,
		"medical_notes": c.MedicalNotes,
		"updated_at":    time.Now(),
	}}
	opts := options.FindOneAndUpdate().SetReturnDocument(options.After)
	var out models.Child
	if err := r.col.FindOneAndUpdate(ctx, bson.M{"_id": oid}, update, opts).Decode(&out); err != nil {
		return nil, err
	}
	return &out, nil
}

func (r *childRepository) SetKeyPerson(ctx context.Context, id, staffID string) (*models.Child, error) {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, err
	}
	update := bson.M{"$set": bson.M{"key_person_id": staffID, "updated_at": time.Now()}}
	opts := options.FindOneAndUpdate().SetReturnDocument(options.After)
	var out models.Child
	if err := r.col.FindOneAndUpdate(ctx, bson.M{"_id": oid}, update, opts).Decode(&out); err != nil {
		return nil, err
	}
	return &out, nil
}

func (r *childRepository) Delete(ctx context.Context, id string) error {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return err
	}
	_, err = r.col.DeleteOne(ctx, bson.M{"_id": oid})
	return err
}
