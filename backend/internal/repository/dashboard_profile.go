package repository

import (
	"context"
	"errors"
	"time"

	"github.com/blue-nest-montessori/api/internal/models"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type DashboardProfileRepository interface {
	FindAll(ctx context.Context) ([]models.DashboardProfile, error)
	FindBySlug(ctx context.Context, slug string) (*models.DashboardProfile, error)
	// FindByRole returns the profile that is the default for the given role, or (nil, nil).
	FindByRole(ctx context.Context, role models.Role) (*models.DashboardProfile, error)
	Upsert(ctx context.Context, p models.DashboardProfile) (*models.DashboardProfile, error)
	Delete(ctx context.Context, slug string) error
	// ClearRoleFromOthers removes a role from every profile except the given slug,
	// keeping the role→profile mapping unique.
	ClearRoleFromOthers(ctx context.Context, role models.Role, keepSlug string) error
}

type dashboardProfileRepository struct {
	col *TenantCollection
}

func NewDashboardProfileRepository(db *mongo.Database) DashboardProfileRepository {
	col := db.Collection("dashboard_profiles")
	// Slug uniqueness is PER ORG (audit finding: the legacy global unique on
	// bare slug blocked tenant B from using a slug tenant A already had —
	// same defect class as the branch-slug index fixed in the multi-tenant
	// hardening pass). Legacy index dropped by its auto-generated name.
	dropIndexIfExists("dashboard_profiles", col, "slug_1")
	ensureIndexes("dashboard_profiles", col, mongo.IndexModel{
		Keys:    bson.D{{Key: "org_id", Value: 1}, {Key: "slug", Value: 1}},
		Options: options.Index().SetUnique(true).SetName("uniq_dashboard_profile_slug_per_org"),
	})
	return &dashboardProfileRepository{col: NewTenantCollectionFrom(col)}
}

func (r *dashboardProfileRepository) FindAll(ctx context.Context) ([]models.DashboardProfile, error) {
	cur, err := r.col.Find(ctx, bson.M{}, options.Find().SetSort(bson.D{{Key: "name", Value: 1}}))
	if err != nil {
		return nil, err
	}
	var out []models.DashboardProfile
	if err := cur.All(ctx, &out); err != nil {
		return nil, err
	}
	return out, nil
}

func (r *dashboardProfileRepository) FindBySlug(ctx context.Context, slug string) (*models.DashboardProfile, error) {
	var p models.DashboardProfile
	err := r.col.FindOne(ctx, bson.M{"slug": slug}).Decode(&p)
	if errors.Is(err, mongo.ErrNoDocuments) {
		return nil, errors.New("profile not found")
	}
	if err != nil {
		return nil, err
	}
	return &p, nil
}

func (r *dashboardProfileRepository) FindByRole(ctx context.Context, role models.Role) (*models.DashboardProfile, error) {
	var p models.DashboardProfile
	err := r.col.FindOne(ctx, bson.M{"default_for_roles": role}).Decode(&p)
	if errors.Is(err, mongo.ErrNoDocuments) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &p, nil
}

func (r *dashboardProfileRepository) Upsert(ctx context.Context, p models.DashboardProfile) (*models.DashboardProfile, error) {
	if p.Widgets == nil {
		p.Widgets = []models.DashboardWidget{}
	}
	if p.DefaultForRoles == nil {
		p.DefaultForRoles = []models.Role{}
	}
	p.UpdatedAt = time.Now()
	update := bson.M{"$set": bson.M{
		"name":              p.Name,
		"description":       p.Description,
		"widgets":           p.Widgets,
		"default_for_roles": p.DefaultForRoles,
		"updated_at":        p.UpdatedAt,
	}}
	opts := options.FindOneAndUpdate().SetUpsert(true).SetReturnDocument(options.After)
	var out models.DashboardProfile
	if err := r.col.FindOneAndUpdate(ctx, bson.M{"slug": p.Slug}, update, opts).Decode(&out); err != nil {
		return nil, err
	}
	return &out, nil
}

func (r *dashboardProfileRepository) Delete(ctx context.Context, slug string) error {
	res, err := r.col.DeleteOne(ctx, bson.M{"slug": slug})
	if err != nil {
		return err
	}
	if res.DeletedCount == 0 {
		return errors.New("profile not found")
	}
	return nil
}

func (r *dashboardProfileRepository) ClearRoleFromOthers(ctx context.Context, role models.Role, keepSlug string) error {
	_, err := r.col.UpdateMany(ctx,
		bson.M{"slug": bson.M{"$ne": keepSlug}, "default_for_roles": role},
		bson.M{"$pull": bson.M{"default_for_roles": role}},
	)
	return err
}
