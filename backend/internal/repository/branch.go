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

type BranchRepository interface {
	// FindAll returns non-archived branches (public + admin default view).
	FindAll(ctx context.Context) ([]models.Branch, error)
	// FindAllAdmin optionally includes archived branches.
	FindAllAdmin(ctx context.Context, includeArchived bool) ([]models.Branch, error)
	FindBySlug(ctx context.Context, slug string) (*models.Branch, error)
	Create(ctx context.Context, b *models.Branch) error
	Update(ctx context.Context, slug string, b models.Branch) (*models.Branch, error)
	SetManagers(ctx context.Context, slug string, m models.BranchManagers) (*models.Branch, error)
	Archive(ctx context.Context, slug string, archived bool) error
	// UpdateGoogleCache refreshes the cached GBP signals from a digest ingest
	// (leaves the admin-set links untouched).
	UpdateGoogleCache(ctx context.Context, slug string, rating float64, reviewCount int) error
}

type branchRepository struct {
	col *mongo.Collection
}

func NewBranchRepository(db *mongo.Database) BranchRepository {
	return &branchRepository{col: db.Collection("branches")}
}

func (r *branchRepository) FindAll(ctx context.Context) ([]models.Branch, error) {
	return r.find(ctx, bson.M{"archived_at": bson.M{"$exists": false}})
}

func (r *branchRepository) FindAllAdmin(ctx context.Context, includeArchived bool) ([]models.Branch, error) {
	filter := bson.M{}
	if !includeArchived {
		filter["archived_at"] = bson.M{"$exists": false}
	}
	return r.find(ctx, filter)
}

func (r *branchRepository) find(ctx context.Context, filter bson.M) ([]models.Branch, error) {
	opts := options.Find().SetSort(bson.D{{Key: "name", Value: 1}})
	cursor, err := r.col.Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	results := make([]models.Branch, 0)
	return results, cursor.All(ctx, &results)
}

func (r *branchRepository) FindBySlug(ctx context.Context, slug string) (*models.Branch, error) {
	var branch models.Branch
	if err := r.col.FindOne(ctx, bson.M{"slug": slug}).Decode(&branch); err != nil {
		return nil, err
	}
	return &branch, nil
}

func (r *branchRepository) Create(ctx context.Context, b *models.Branch) error {
	b.ID = primitive.NewObjectID()
	now := time.Now()
	b.CreatedAt = now
	b.UpdatedAt = now
	_, err := r.col.InsertOne(ctx, b)
	return err
}

func (r *branchRepository) Update(ctx context.Context, slug string, b models.Branch) (*models.Branch, error) {
	update := bson.M{"$set": bson.M{
		"name":              b.Name,
		"status":            b.Status,
		"short_description": b.ShortDescription,
		"hero_image_url":    b.HeroImageURL,
		"logo_url":          b.LogoURL,
		"gallery":           b.Gallery,
		"contact":           b.Contact,
		"admissions":        b.Admissions,
		"postcode":          b.Postcode,
		"lat":               b.Lat,
		"lng":               b.Lng,
		"website":           b.Website,
		"parking":           b.Parking,
		"opening_hours":     b.OpeningHours,
		"capacity":          b.Capacity,
		"age_groups":        b.AgeGroups,
		"ofsted_rating":     b.OfstedRating,
		"ofsted_report_url": b.OfstedReportURL,
		"google":            b.Google,
		"social":            b.Social,
		"group_id":          b.GroupID,
		"updated_at":        time.Now(),
	}}
	opts := options.FindOneAndUpdate().SetReturnDocument(options.After)
	var out models.Branch
	if err := r.col.FindOneAndUpdate(ctx, bson.M{"slug": slug}, update, opts).Decode(&out); err != nil {
		return nil, err
	}
	return &out, nil
}

func (r *branchRepository) SetManagers(ctx context.Context, slug string, m models.BranchManagers) (*models.Branch, error) {
	update := bson.M{"$set": bson.M{"managers": m, "updated_at": time.Now()}}
	opts := options.FindOneAndUpdate().SetReturnDocument(options.After)
	var out models.Branch
	if err := r.col.FindOneAndUpdate(ctx, bson.M{"slug": slug}, update, opts).Decode(&out); err != nil {
		return nil, err
	}
	return &out, nil
}

func (r *branchRepository) UpdateGoogleCache(ctx context.Context, slug string, rating float64, reviewCount int) error {
	now := time.Now()
	_, err := r.col.UpdateOne(ctx, bson.M{"slug": slug}, bson.M{"$set": bson.M{
		"google.rating":          rating,
		"google.review_count":    reviewCount,
		"google.last_sync":       now,
		"google.business_status": "OPERATIONAL",
		"updated_at":             now,
	}})
	return err
}

func (r *branchRepository) Archive(ctx context.Context, slug string, archived bool) error {
	var update bson.M
	if archived {
		update = bson.M{"$set": bson.M{"archived_at": time.Now(), "updated_at": time.Now()}}
	} else {
		update = bson.M{"$unset": bson.M{"archived_at": ""}, "$set": bson.M{"updated_at": time.Now()}}
	}
	_, err := r.col.UpdateOne(ctx, bson.M{"slug": slug}, update)
	return err
}
