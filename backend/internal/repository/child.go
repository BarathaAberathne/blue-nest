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

// ChildFilter has no Room field on purpose: room placement lives in the
// child_room_assignments collection (children.room_id is a computed bson:"-"
// projection), so a stored-field room filter can never match — filter on the
// projected room after List, like the UI does.
type ChildFilter struct {
	Branch string
	// Room filters by CURRENT room. Room placement lives in the canonical
	// child_room_assignments (children.room_id is a computed bson:"-"
	// projection), so this is resolved by the SERVICE via the assignment
	// model — never as a Mongo filter here.
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
	SetPhoto(ctx context.Context, id, url string) (*models.Child, error)
	SetSendStatus(ctx context.Context, id string, status models.SendStatus) (*models.Child, error)
	FindByEnquiryID(ctx context.Context, enquiryID string) (*models.Child, error)
	Update(ctx context.Context, id string, c models.Child) (*models.Child, error)
	Delete(ctx context.Context, id string) error
}

type childRepository struct {
	col *TenantCollection
}

func NewChildRepository(db *mongo.Database) ChildRepository {
	col := db.Collection("children")
	ensureIndexes("children", col,
		// The largest tenant-scoped collection had no index at all: list
		// filters run on {org, branch, status}, and the alphabetical list
		// sort on {org, last_name, first_name}.
		mongo.IndexModel{
			Keys:    bson.D{{Key: "org_id", Value: 1}, {Key: "branch_slug", Value: 1}, {Key: "status", Value: 1}},
			Options: options.Index().SetName("idx_children_org_branch_status"),
		},
		mongo.IndexModel{
			Keys:    bson.D{{Key: "org_id", Value: 1}, {Key: "last_name", Value: 1}, {Key: "first_name", Value: 1}},
			Options: options.Index().SetName("idx_children_org_name"),
		},
	)
	return &childRepository{col: NewTenantCollectionFrom(col)}
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
	// NOTE: no room filter here — room placement lives in the canonical
	// child_room_assignments; the service layer resolves ChildFilter.Room.
	if f.Status != "" {
		filter["status"] = f.Status
	}
	if f.KeyPerson != "" {
		filter["key_person_id"] = f.KeyPerson
	}
	if f.Q != "" {
		// Escaped so free-text search input is matched literally — see staff.go.
		q := regexp.QuoteMeta(f.Q)
		filter["$or"] = bson.A{
			bson.M{"first_name": bson.M{"$regex": q, "$options": "i"}},
			bson.M{"last_name": bson.M{"$regex": q, "$options": "i"}},
			bson.M{"ref": bson.M{"$regex": q, "$options": "i"}},
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
		"address":       c.Address,
		"branch_slug":   c.BranchSlug,
		"status":        c.Status,
		"start_date":    c.StartDate,
		"guardians":     c.Guardians,
		"funding_type":  c.FundingType,
		"sessions":      c.Sessions,
		"allergy_tags":  c.AllergyTags,
		"dietary_tags":  c.DietaryTags,
		"allergies":     c.Allergies,
		"dietary_reqs":  c.DietaryReqs,
		"medical_notes": c.MedicalNotes,
		"leave_date":    c.LeaveDate,
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

func (r *childRepository) SetPhoto(ctx context.Context, id, url string) (*models.Child, error) {
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
	var out models.Child
	if err := r.col.FindOneAndUpdate(ctx, bson.M{"_id": oid}, update, opts).Decode(&out); err != nil {
		return nil, err
	}
	return &out, nil
}

// SetSendStatus writes the operational SEND marker — called ONLY by the SEND
// service as a projection of the ChildSendSupport profile.
func (r *childRepository) SetSendStatus(ctx context.Context, id string, status models.SendStatus) (*models.Child, error) {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, err
	}
	update := bson.M{"$set": bson.M{"updated_at": time.Now()}}
	if status == models.SendNone {
		update["$unset"] = bson.M{"send_status": ""}
	} else {
		update["$set"].(bson.M)["send_status"] = status
	}
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
