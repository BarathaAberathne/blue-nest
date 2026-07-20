package repository

import (
	"context"
	"errors"
	"time"

	"github.com/blue-nest-montessori/api/internal/models"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// OrganisationRepository manages the tenant list itself — a GLOBAL collection
// (not org-scoped): it is the registry of tenants, so it uses the raw
// collection, never the tenant wrapper.
type OrganisationRepository interface {
	Create(ctx context.Context, o *models.Organisation) error
	FindAll(ctx context.Context) ([]models.Organisation, error)
	FindByID(ctx context.Context, id string) (*models.Organisation, error)
	FindBySlug(ctx context.Context, slug string) (*models.Organisation, error)
	FindByDomain(ctx context.Context, domain string) (*models.Organisation, error)
	Update(ctx context.Context, id string, o models.Organisation) (*models.Organisation, error)
}

type organisationRepository struct {
	col *mongo.Collection
}

func NewOrganisationRepository(db *mongo.Database) OrganisationRepository {
	col := db.Collection("organisations")
	// slug is the stable tenant key — unique.
	_, _ = col.Indexes().CreateOne(context.Background(), mongo.IndexModel{
		Keys:    bson.D{{Key: "slug", Value: 1}},
		Options: options.Index().SetUnique(true),
	})
	return &organisationRepository{col: col}
}

func (r *organisationRepository) Create(ctx context.Context, o *models.Organisation) error {
	o.ID = primitive.NewObjectID()
	now := time.Now()
	o.CreatedAt, o.UpdatedAt = now, now
	if o.Status == "" {
		o.Status = models.OrgActive
	}
	_, err := r.col.InsertOne(ctx, o)
	return err
}

func (r *organisationRepository) FindAll(ctx context.Context) ([]models.Organisation, error) {
	cursor, err := r.col.Find(ctx, bson.M{}, options.Find().SetSort(bson.D{{Key: "name", Value: 1}}))
	if err != nil {
		return nil, err
	}
	out := make([]models.Organisation, 0)
	return out, cursor.All(ctx, &out)
}

func (r *organisationRepository) FindByID(ctx context.Context, id string) (*models.Organisation, error) {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, err
	}
	return r.findOne(ctx, bson.M{"_id": oid})
}

func (r *organisationRepository) FindBySlug(ctx context.Context, slug string) (*models.Organisation, error) {
	return r.findOne(ctx, bson.M{"slug": slug})
}

func (r *organisationRepository) FindByDomain(ctx context.Context, domain string) (*models.Organisation, error) {
	return r.findOne(ctx, bson.M{"domains": domain})
}

func (r *organisationRepository) findOne(ctx context.Context, filter bson.M) (*models.Organisation, error) {
	var o models.Organisation
	if err := r.col.FindOne(ctx, filter).Decode(&o); err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return nil, errors.New("organisation not found")
		}
		return nil, err
	}
	return &o, nil
}

func (r *organisationRepository) Update(ctx context.Context, id string, o models.Organisation) (*models.Organisation, error) {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, err
	}
	update := bson.M{"$set": bson.M{
		"name": o.Name, "status": o.Status, "plan": o.Plan,
		"branding": o.Branding, "domains": o.Domains, "settings": o.Settings,
		"updated_at": time.Now(),
	}}
	opts := options.FindOneAndUpdate().SetReturnDocument(options.After)
	var out models.Organisation
	if err := r.col.FindOneAndUpdate(ctx, bson.M{"_id": oid}, update, opts).Decode(&out); err != nil {
		return nil, err
	}
	return &out, nil
}
