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

// TaxonomyFilter scopes a lookup query. Category is required in practice;
// Branch, when set, returns that branch's terms PLUS org-wide defaults (empty
// branch_slug); ActiveOnly restricts to enabled terms (for pickers).
type TaxonomyFilter struct {
	Category   string
	Branch     string
	ActiveOnly bool
	OrgWideAlso bool // when Branch set: also include org-wide (branch_slug == "")
}

type TaxonomyRepository interface {
	Create(ctx context.Context, t *models.TaxonomyTerm) error
	FindAll(ctx context.Context, f TaxonomyFilter) ([]models.TaxonomyTerm, error)
	FindByID(ctx context.Context, id string) (*models.TaxonomyTerm, error)
	Update(ctx context.Context, id string, t models.TaxonomyTerm) (*models.TaxonomyTerm, error)
	Delete(ctx context.Context, id string) error
	// ExistsCode reports whether a term with the same category+branch+code
	// already exists (uniqueness guard), optionally excluding one id (updates).
	ExistsCode(ctx context.Context, category, branch, code, excludeID string) (bool, error)
}

type taxonomyRepository struct {
	col *TenantCollection
}

func NewTaxonomyRepository(db *mongo.Database) TaxonomyRepository {
	return &taxonomyRepository{col: NewTenantCollection(db, "taxonomy_terms")}
}

func (r *taxonomyRepository) query(f TaxonomyFilter) bson.M {
	q := bson.M{}
	if f.Category != "" {
		q["category"] = f.Category
	}
	if f.ActiveOnly {
		q["active"] = true
	}
	if f.Branch != "" {
		if f.OrgWideAlso {
			q["$or"] = bson.A{
				bson.M{"branch_slug": f.Branch},
				bson.M{"branch_slug": ""},
				bson.M{"branch_slug": bson.M{"$exists": false}},
			}
		} else {
			q["branch_slug"] = f.Branch
		}
	}
	return q
}

func (r *taxonomyRepository) Create(ctx context.Context, t *models.TaxonomyTerm) error {
	t.ID = primitive.NewObjectID()
	now := time.Now()
	t.CreatedAt = now
	t.UpdatedAt = now
	_, err := r.col.InsertOne(ctx, t)
	return err
}

func (r *taxonomyRepository) FindAll(ctx context.Context, f TaxonomyFilter) ([]models.TaxonomyTerm, error) {
	opts := options.Find().SetSort(bson.D{
		{Key: "branch_slug", Value: 1},
		{Key: "sort_order", Value: 1},
		{Key: "label", Value: 1},
	})
	cursor, err := r.col.Find(ctx, r.query(f), opts)
	if err != nil {
		return nil, err
	}
	results := make([]models.TaxonomyTerm, 0)
	return results, cursor.All(ctx, &results)
}

func (r *taxonomyRepository) FindByID(ctx context.Context, id string) (*models.TaxonomyTerm, error) {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, err
	}
	var t models.TaxonomyTerm
	if err = r.col.FindOne(ctx, bson.M{"_id": oid}).Decode(&t); err != nil {
		return nil, err
	}
	return &t, nil
}

func (r *taxonomyRepository) Update(ctx context.Context, id string, t models.TaxonomyTerm) (*models.TaxonomyTerm, error) {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, err
	}
	t.UpdatedAt = time.Now()
	set := bson.M{
		"branch_slug": t.BranchSlug, "category": t.Category, "code": t.Code,
		"label": t.Label, "start_time": t.StartTime, "end_time": t.EndTime,
		"min_age_months": t.MinAgeMonths, "max_age_months": t.MaxAgeMonths,
		"sort_order": t.SortOrder, "active": t.Active, "updated_at": t.UpdatedAt,
	}
	if _, err := r.col.UpdateOne(ctx, bson.M{"_id": oid}, bson.M{"$set": set}); err != nil {
		return nil, err
	}
	return r.FindByID(ctx, id)
}

func (r *taxonomyRepository) Delete(ctx context.Context, id string) error {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return err
	}
	_, err = r.col.DeleteOne(ctx, bson.M{"_id": oid})
	return err
}

func (r *taxonomyRepository) ExistsCode(ctx context.Context, category, branch, code, excludeID string) (bool, error) {
	q := bson.M{"category": category, "branch_slug": branch, "code": code}
	if excludeID != "" {
		if oid, err := primitive.ObjectIDFromHex(excludeID); err == nil {
			q["_id"] = bson.M{"$ne": oid}
		}
	}
	n, err := r.col.CountDocuments(ctx, q)
	return n > 0, err
}
