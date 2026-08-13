package repository

import (
	"context"
	"log/slog"
	"time"

	"github.com/blue-nest-montessori/api/internal/models"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// InductionRepository stores one induction document per child (collection
// `child_inductions`, tenant-scoped, unique per child).
type InductionRepository interface {
	FindByChild(ctx context.Context, childID string) (*models.ChildInduction, error)
	FindByChildren(ctx context.Context, childIDs []string) ([]models.ChildInduction, error)
	Upsert(ctx context.Context, ind *models.ChildInduction) (*models.ChildInduction, error)
	Delete(ctx context.Context, childID string) error
}

type inductionRepository struct {
	col *TenantCollection
}

func NewInductionRepository(db *mongo.Database) InductionRepository {
	col := db.Collection("child_inductions")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if _, err := col.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys:    bson.D{{Key: "org_id", Value: 1}, {Key: "child_id", Value: 1}},
		Options: options.Index().SetUnique(true).SetName("uniq_induction_per_child"),
	}); err != nil {
		slog.Warn("child_inductions: could not create unique index", "err", err)
	}
	return &inductionRepository{col: NewTenantCollectionFrom(col)}
}

func (r *inductionRepository) FindByChild(ctx context.Context, childID string) (*models.ChildInduction, error) {
	var ind models.ChildInduction
	if err := r.col.FindOne(ctx, bson.M{"child_id": childID}).Decode(&ind); err != nil {
		return nil, err
	}
	return &ind, nil
}

func (r *inductionRepository) FindByChildren(ctx context.Context, childIDs []string) ([]models.ChildInduction, error) {
	cur, err := r.col.Find(ctx, bson.M{"child_id": bson.M{"$in": childIDs}})
	if err != nil {
		return nil, err
	}
	out := make([]models.ChildInduction, 0)
	return out, cur.All(ctx, &out)
}

// Upsert replaces the whole induction document for the child (the service
// mutates the fetched struct then persists it — sections are nested maps, so
// a full-document write avoids per-field $set drift entirely).
func (r *inductionRepository) Upsert(ctx context.Context, ind *models.ChildInduction) (*models.ChildInduction, error) {
	now := time.Now()
	if ind.CreatedAt.IsZero() {
		ind.CreatedAt = now
	}
	ind.UpdatedAt = now
	doc, err := bson.Marshal(ind)
	if err != nil {
		return nil, err
	}
	var set bson.M
	if err := bson.Unmarshal(doc, &set); err != nil {
		return nil, err
	}
	delete(set, "_id")
	delete(set, "org_id")
	// Clearable pointer fields must be explicitly unset when absent (the
	// omitempty single-use-token lesson — see repository/parent.go).
	unset := bson.M{}
	for _, f := range []string{"submitted_by", "submitted_at", "reviewed_by", "reviewed_at", "review_note"} {
		if _, ok := set[f]; !ok {
			unset[f] = ""
		}
	}
	update := bson.M{"$set": set}
	if len(unset) > 0 {
		update["$unset"] = unset
	}
	opts := options.FindOneAndUpdate().SetUpsert(true).SetReturnDocument(options.After)
	var out models.ChildInduction
	if err := r.col.FindOneAndUpdate(ctx, bson.M{"child_id": ind.ChildID}, update, opts).Decode(&out); err != nil {
		return nil, err
	}
	return &out, nil
}

func (r *inductionRepository) Delete(ctx context.Context, childID string) error {
	_, err := r.col.DeleteOne(ctx, bson.M{"child_id": childID})
	return err
}

// ── Consents ─────────────────────────────────────────────────────────────────

// ConsentRepository stores append-only consent decisions (collection
// `consents`, tenant-scoped). The latest row per (child, key) is current.
type ConsentRepository interface {
	FindByChild(ctx context.Context, childID string) ([]models.Consent, error)
	FindByChildren(ctx context.Context, childIDs []string) ([]models.Consent, error)
	Create(ctx context.Context, c *models.Consent) error
	DeleteByChild(ctx context.Context, childID string) error
}

type consentRepository struct {
	col *TenantCollection
}

func NewConsentRepository(db *mongo.Database) ConsentRepository {
	col := db.Collection("consents")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if _, err := col.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys:    bson.D{{Key: "org_id", Value: 1}, {Key: "child_id", Value: 1}, {Key: "key", Value: 1}, {Key: "created_at", Value: -1}},
		Options: options.Index().SetName("idx_consents_child_key"),
	}); err != nil {
		slog.Warn("consents: could not create index", "err", err)
	}
	return &consentRepository{col: NewTenantCollectionFrom(col)}
}

func (r *consentRepository) FindByChild(ctx context.Context, childID string) ([]models.Consent, error) {
	cur, err := r.col.Find(ctx, bson.M{"child_id": childID}, options.Find().SetSort(bson.D{{Key: "created_at", Value: 1}}))
	if err != nil {
		return nil, err
	}
	out := make([]models.Consent, 0)
	return out, cur.All(ctx, &out)
}

func (r *consentRepository) FindByChildren(ctx context.Context, childIDs []string) ([]models.Consent, error) {
	cur, err := r.col.Find(ctx, bson.M{"child_id": bson.M{"$in": childIDs}}, options.Find().SetSort(bson.D{{Key: "created_at", Value: 1}}))
	if err != nil {
		return nil, err
	}
	out := make([]models.Consent, 0)
	return out, cur.All(ctx, &out)
}

func (r *consentRepository) Create(ctx context.Context, c *models.Consent) error {
	c.CreatedAt = time.Now()
	_, err := r.col.InsertOne(ctx, c)
	return err
}

func (r *consentRepository) DeleteByChild(ctx context.Context, childID string) error {
	_, err := r.col.DeleteMany(ctx, bson.M{"child_id": childID})
	return err
}
