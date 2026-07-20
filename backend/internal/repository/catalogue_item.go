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

type CatalogueItemRepository interface {
	FindAll(ctx context.Context) ([]models.CatalogueItem, error)
	FindByID(ctx context.Context, id string) (*models.CatalogueItem, error)
	FindByIDs(ctx context.Context, ids []string) ([]models.CatalogueItem, error)
	Create(ctx context.Context, c models.CatalogueItem) (*models.CatalogueItem, error)
	Update(ctx context.Context, id string, c models.CatalogueItem) (*models.CatalogueItem, error)
	Delete(ctx context.Context, id string) error
	// UpsertByName caches a discovered item by (case-insensitive) name — used by
	// the sourcing engine to remember search results. Returns the stored item.
	UpsertByName(ctx context.Context, c models.CatalogueItem) (*models.CatalogueItem, error)
}

type catalogueItemRepository struct {
	col *TenantCollection
}

func NewCatalogueItemRepository(db *mongo.Database) CatalogueItemRepository {
	return &catalogueItemRepository{col: NewTenantCollection(db, "catalogue_items")}
}

func (r *catalogueItemRepository) FindAll(ctx context.Context) ([]models.CatalogueItem, error) {
	opts := options.Find().SetSort(bson.D{{Key: "name", Value: 1}})
	cursor, err := r.col.Find(ctx, bson.M{}, opts)
	if err != nil {
		return nil, err
	}
	results := make([]models.CatalogueItem, 0)
	return results, cursor.All(ctx, &results)
}

func (r *catalogueItemRepository) FindByID(ctx context.Context, id string) (*models.CatalogueItem, error) {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, err
	}
	var c models.CatalogueItem
	if err = r.col.FindOne(ctx, bson.M{"_id": oid}).Decode(&c); err != nil {
		return nil, err
	}
	return &c, nil
}

func (r *catalogueItemRepository) FindByIDs(ctx context.Context, ids []string) ([]models.CatalogueItem, error) {
	oids := make([]primitive.ObjectID, 0, len(ids))
	for _, id := range ids {
		if oid, err := primitive.ObjectIDFromHex(id); err == nil {
			oids = append(oids, oid)
		}
	}
	cursor, err := r.col.Find(ctx, bson.M{"_id": bson.M{"$in": oids}})
	if err != nil {
		return nil, err
	}
	results := make([]models.CatalogueItem, 0)
	return results, cursor.All(ctx, &results)
}

func (r *catalogueItemRepository) Create(ctx context.Context, c models.CatalogueItem) (*models.CatalogueItem, error) {
	c.ID = primitive.NewObjectID()
	now := time.Now()
	c.CreatedAt = now
	c.UpdatedAt = now
	if c.Offers == nil {
		c.Offers = []models.CatalogueOffer{}
	}
	_, err := r.col.InsertOne(ctx, c)
	return &c, err
}

func (r *catalogueItemRepository) Update(ctx context.Context, id string, c models.CatalogueItem) (*models.CatalogueItem, error) {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, err
	}
	update := bson.M{"$set": bson.M{
		"name":       c.Name,
		"category":   c.Category,
		"offers":     c.Offers,
		"aliases":    c.Aliases,
		"is_active":  c.IsActive,
		"updated_at": time.Now(),
	}}
	opts := options.FindOneAndUpdate().SetReturnDocument(options.After)
	var out models.CatalogueItem
	if err := r.col.FindOneAndUpdate(ctx, bson.M{"_id": oid}, update, opts).Decode(&out); err != nil {
		return nil, err
	}
	return &out, nil
}

func (r *catalogueItemRepository) Delete(ctx context.Context, id string) error {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return err
	}
	_, err = r.col.DeleteOne(ctx, bson.M{"_id": oid})
	return err
}

func (r *catalogueItemRepository) UpsertByName(ctx context.Context, c models.CatalogueItem) (*models.CatalogueItem, error) {
	now := time.Now()
	// Case-insensitive exact match on name (metacharacters escaped).
	filter := bson.M{"name": bson.M{"$regex": "^" + regexp.QuoteMeta(c.Name) + "$", "$options": "i"}}
	update := bson.M{
		"$set": bson.M{
			"name":       c.Name,
			"category":   c.Category,
			"offers":     c.Offers,
			"aliases":    c.Aliases,
			"is_active":  c.IsActive,
			"updated_at": now,
		},
		"$setOnInsert": bson.M{
			"_id":        primitive.NewObjectID(),
			"created_at": now,
		},
	}
	opts := options.FindOneAndUpdate().SetUpsert(true).SetReturnDocument(options.After)
	var out models.CatalogueItem
	if err := r.col.FindOneAndUpdate(ctx, filter, update, opts).Decode(&out); err != nil {
		return nil, err
	}
	return &out, nil
}
