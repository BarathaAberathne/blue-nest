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

// ParentRepository stores the canonical parent/guardian person records
// (collection `parents`, tenant-scoped).
type ParentRepository interface {
	FindAll(ctx context.Context, q string) ([]models.Parent, error)
	FindByID(ctx context.Context, id string) (*models.Parent, error)
	FindByIDs(ctx context.Context, ids []string) ([]models.Parent, error)
	FindByEmail(ctx context.Context, email string) (*models.Parent, error)
	FindByUserID(ctx context.Context, userID string) (*models.Parent, error)
	Create(ctx context.Context, p *models.Parent) error
	Update(ctx context.Context, id string, p models.Parent) (*models.Parent, error)
	Delete(ctx context.Context, id string) error
}

type parentRepository struct {
	col *TenantCollection
}

func NewParentRepository(db *mongo.Database) ParentRepository {
	col := db.Collection("parents")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	// Email lookup powers sibling detection + invite flows; non-unique (two
	// parents may share a family address book entry) but indexed per org.
	if _, err := col.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys:    bson.D{{Key: "org_id", Value: 1}, {Key: "email", Value: 1}},
		Options: options.Index().SetName("idx_parent_email_per_org"),
	}); err != nil {
		slog.Warn("parents: could not create {org_id, email} index", "err", err)
	}
	return &parentRepository{col: NewTenantCollectionFrom(col)}
}

func (r *parentRepository) FindAll(ctx context.Context, q string) ([]models.Parent, error) {
	filter := bson.M{}
	if q != "" {
		// QuoteMeta neutralises regex metacharacters — free-text search must
		// never become an operator/ReDoS vector (see injection-fuzz.sh).
		rx := bson.M{"$regex": regexp.QuoteMeta(q), "$options": "i"}
		filter["$or"] = []bson.M{{"first_name": rx}, {"last_name": rx}, {"email": rx}, {"ref": rx}}
	}
	cur, err := r.col.Find(ctx, filter, options.Find().SetSort(bson.D{{Key: "last_name", Value: 1}, {Key: "first_name", Value: 1}}))
	if err != nil {
		return nil, err
	}
	out := make([]models.Parent, 0)
	return out, cur.All(ctx, &out)
}

func (r *parentRepository) FindByID(ctx context.Context, id string) (*models.Parent, error) {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, err
	}
	var p models.Parent
	if err := r.col.FindOne(ctx, bson.M{"_id": oid}).Decode(&p); err != nil {
		return nil, err
	}
	return &p, nil
}

func (r *parentRepository) FindByIDs(ctx context.Context, ids []string) ([]models.Parent, error) {
	oids := make([]primitive.ObjectID, 0, len(ids))
	for _, id := range ids {
		if oid, err := primitive.ObjectIDFromHex(id); err == nil {
			oids = append(oids, oid)
		}
	}
	cur, err := r.col.Find(ctx, bson.M{"_id": bson.M{"$in": oids}})
	if err != nil {
		return nil, err
	}
	out := make([]models.Parent, 0)
	return out, cur.All(ctx, &out)
}

func (r *parentRepository) FindByEmail(ctx context.Context, email string) (*models.Parent, error) {
	var p models.Parent
	if err := r.col.FindOne(ctx, bson.M{"email": email}).Decode(&p); err != nil {
		return nil, err
	}
	return &p, nil
}

func (r *parentRepository) FindByUserID(ctx context.Context, userID string) (*models.Parent, error) {
	var p models.Parent
	if err := r.col.FindOne(ctx, bson.M{"user_id": userID}).Decode(&p); err != nil {
		return nil, err
	}
	return &p, nil
}

func (r *parentRepository) Create(ctx context.Context, p *models.Parent) error {
	now := time.Now()
	p.CreatedAt, p.UpdatedAt = now, now
	res, err := r.col.InsertOne(ctx, p)
	if err != nil {
		return err
	}
	if oid, ok := res.InsertedID.(primitive.ObjectID); ok {
		p.ID = oid
	}
	return nil
}

func (r *parentRepository) Update(ctx context.Context, id string, p models.Parent) (*models.Parent, error) {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, err
	}
	// Full-field $set from the struct (bson marshal), preserving _id/org/ref/
	// created_at — avoids the hardcoded-map drift bug fixed twice already
	// (taxonomy, child.Update).
	p.UpdatedAt = time.Now()
	doc, err := bson.Marshal(p)
	if err != nil {
		return nil, err
	}
	var set bson.M
	if err := bson.Unmarshal(doc, &set); err != nil {
		return nil, err
	}
	delete(set, "_id")
	delete(set, "org_id")
	delete(set, "ref")
	delete(set, "created_at")
	// omitempty drops cleared fields from the marshal, so "" / nil would
	// silently KEEP the stored value — for the invite token that would make
	// "single-use" a lie (caught by PARENT-TC-003). Explicitly unset any
	// clearable security/lifecycle field the struct no longer carries.
	unset := bson.M{}
	for _, f := range []string{"invite_token_hash", "invite_expires_at", "temporary_until"} {
		if _, ok := set[f]; !ok {
			unset[f] = ""
		}
	}
	update := bson.M{"$set": set}
	if len(unset) > 0 {
		update["$unset"] = unset
	}
	opts := options.FindOneAndUpdate().SetReturnDocument(options.After)
	var out models.Parent
	if err := r.col.FindOneAndUpdate(ctx, bson.M{"_id": oid}, update, opts).Decode(&out); err != nil {
		return nil, err
	}
	return &out, nil
}

func (r *parentRepository) Delete(ctx context.Context, id string) error {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return err
	}
	_, err = r.col.DeleteOne(ctx, bson.M{"_id": oid})
	return err
}

// ── Child ↔ parent relationships ─────────────────────────────────────────────

// ChildParentRepository stores the canonical child↔parent links (collection
// `child_parent_relationships`, tenant-scoped, unique per child+parent).
type ChildParentRepository interface {
	FindByChild(ctx context.Context, childID string) ([]models.ChildParentRelationship, error)
	FindByParent(ctx context.Context, parentID string) ([]models.ChildParentRelationship, error)
	FindByID(ctx context.Context, id string) (*models.ChildParentRelationship, error)
	Create(ctx context.Context, rel *models.ChildParentRelationship) error
	Update(ctx context.Context, id string, rel models.ChildParentRelationship) (*models.ChildParentRelationship, error)
	Delete(ctx context.Context, id string) error
}

type childParentRepository struct {
	col *TenantCollection
}

func NewChildParentRepository(db *mongo.Database) ChildParentRepository {
	col := db.Collection("child_parent_relationships")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if _, err := col.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys:    bson.D{{Key: "org_id", Value: 1}, {Key: "child_id", Value: 1}, {Key: "parent_id", Value: 1}},
		Options: options.Index().SetUnique(true).SetName("uniq_child_parent_per_org"),
	}); err != nil {
		slog.Warn("child_parent_relationships: could not create unique index", "err", err)
	}
	return &childParentRepository{col: NewTenantCollectionFrom(col)}
}

func (r *childParentRepository) FindByChild(ctx context.Context, childID string) ([]models.ChildParentRelationship, error) {
	cur, err := r.col.Find(ctx, bson.M{"child_id": childID}, options.Find().SetSort(bson.D{{Key: "priority", Value: 1}, {Key: "created_at", Value: 1}}))
	if err != nil {
		return nil, err
	}
	out := make([]models.ChildParentRelationship, 0)
	return out, cur.All(ctx, &out)
}

func (r *childParentRepository) FindByParent(ctx context.Context, parentID string) ([]models.ChildParentRelationship, error) {
	cur, err := r.col.Find(ctx, bson.M{"parent_id": parentID}, options.Find().SetSort(bson.D{{Key: "created_at", Value: 1}}))
	if err != nil {
		return nil, err
	}
	out := make([]models.ChildParentRelationship, 0)
	return out, cur.All(ctx, &out)
}

func (r *childParentRepository) FindByID(ctx context.Context, id string) (*models.ChildParentRelationship, error) {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, err
	}
	var rel models.ChildParentRelationship
	if err := r.col.FindOne(ctx, bson.M{"_id": oid}).Decode(&rel); err != nil {
		return nil, err
	}
	return &rel, nil
}

func (r *childParentRepository) Create(ctx context.Context, rel *models.ChildParentRelationship) error {
	now := time.Now()
	rel.CreatedAt, rel.UpdatedAt = now, now
	res, err := r.col.InsertOne(ctx, rel)
	if err != nil {
		return err
	}
	if oid, ok := res.InsertedID.(primitive.ObjectID); ok {
		rel.ID = oid
	}
	return nil
}

func (r *childParentRepository) Update(ctx context.Context, id string, rel models.ChildParentRelationship) (*models.ChildParentRelationship, error) {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, err
	}
	rel.UpdatedAt = time.Now()
	doc, err := bson.Marshal(rel)
	if err != nil {
		return nil, err
	}
	var set bson.M
	if err := bson.Unmarshal(doc, &set); err != nil {
		return nil, err
	}
	delete(set, "_id")
	delete(set, "org_id")
	delete(set, "child_id")
	delete(set, "parent_id")
	delete(set, "created_at")
	opts := options.FindOneAndUpdate().SetReturnDocument(options.After)
	var out models.ChildParentRelationship
	if err := r.col.FindOneAndUpdate(ctx, bson.M{"_id": oid}, bson.M{"$set": set}, opts).Decode(&out); err != nil {
		return nil, err
	}
	return &out, nil
}

func (r *childParentRepository) Delete(ctx context.Context, id string) error {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return err
	}
	_, err = r.col.DeleteOne(ctx, bson.M{"_id": oid})
	return err
}
