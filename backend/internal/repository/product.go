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

type ProductRepository interface {
	FindAll(ctx context.Context) ([]models.Product, error)
	FindAllAdmin(ctx context.Context) ([]models.Product, error)
	FindByID(ctx context.Context, id string) (*models.Product, error)
	FindBySlug(ctx context.Context, slug string) (*models.Product, error)
	FindAllCategories(ctx context.Context) ([]models.Category, error)
	CreateCategory(ctx context.Context, c models.Category) (*models.Category, error)
	UpdateCategory(ctx context.Context, id string, c models.Category) (*models.Category, error)
	DeleteCategory(ctx context.Context, id string) error
	Create(ctx context.Context, p models.Product) (*models.Product, error)
	Update(ctx context.Context, id string, p models.Product) (*models.Product, error)
	Delete(ctx context.Context, id string) error
	UpsertByExternalOrSlug(ctx context.Context, p models.Product) (*models.Product, error)
	DecrementStock(ctx context.Context, productID string, qty int) error
	IncrementStock(ctx context.Context, productID string, qty int) error
}

type productRepository struct {
	products   *TenantCollection
	categories *TenantCollection
}

func NewProductRepository(db *mongo.Database) ProductRepository {
	return &productRepository{
		products:   NewTenantCollection(db, "products"),
		categories: NewTenantCollection(db, "categories"),
	}
}

func (r *productRepository) FindAll(ctx context.Context) ([]models.Product, error) {
	cursor, err := r.products.Find(ctx, bson.M{"is_active": true})
	if err != nil {
		return nil, err
	}
	results := make([]models.Product, 0)
	return results, cursor.All(ctx, &results)
}

func (r *productRepository) FindAllAdmin(ctx context.Context) ([]models.Product, error) {
	cursor, err := r.products.Find(ctx, bson.M{})
	if err != nil {
		return nil, err
	}
	results := make([]models.Product, 0)
	return results, cursor.All(ctx, &results)
}

func (r *productRepository) FindByID(ctx context.Context, id string) (*models.Product, error) {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, err
	}
	var p models.Product
	if err = r.products.FindOne(ctx, bson.M{"_id": oid}).Decode(&p); err != nil {
		return nil, err
	}
	return &p, nil
}

func (r *productRepository) FindBySlug(ctx context.Context, slug string) (*models.Product, error) {
	var p models.Product
	if err := r.products.FindOne(ctx, bson.M{"slug": slug, "is_active": true}).Decode(&p); err != nil {
		return nil, err
	}
	return &p, nil
}

func (r *productRepository) FindAllCategories(ctx context.Context) ([]models.Category, error) {
	cursor, err := r.categories.Find(ctx, bson.M{})
	if err != nil {
		return nil, err
	}
	results := make([]models.Category, 0)
	return results, cursor.All(ctx, &results)
}

func (r *productRepository) Create(ctx context.Context, p models.Product) (*models.Product, error) {
	p.ID = primitive.NewObjectID()
	p.CreatedAt = time.Now()
	p.UpdatedAt = time.Now()
	_, err := r.products.InsertOne(ctx, p)
	return &p, err
}

func (r *productRepository) CreateCategory(ctx context.Context, c models.Category) (*models.Category, error) {
	c.ID = primitive.NewObjectID()
	c.CreatedAt = time.Now()
	_, err := r.categories.InsertOne(ctx, c)
	return &c, err
}

func (r *productRepository) UpdateCategory(ctx context.Context, id string, c models.Category) (*models.Category, error) {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, err
	}

	update := bson.M{
		"$set": bson.M{
			"slug": c.Slug,
			"name": c.Name,
		},
	}

	opts := options.FindOneAndUpdate().SetReturnDocument(options.After)
	var out models.Category
	if err := r.categories.FindOneAndUpdate(ctx, bson.M{"_id": oid}, update, opts).Decode(&out); err != nil {
		return nil, err
	}

	return &out, nil
}

func (r *productRepository) DeleteCategory(ctx context.Context, id string) error {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return err
	}
	_, err = r.categories.DeleteOne(ctx, bson.M{"_id": oid})
	return err
}

func (r *productRepository) Update(ctx context.Context, id string, p models.Product) (*models.Product, error) {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, err
	}

	update := bson.M{
		"$set": bson.M{
			"external_id":   p.ExternalID,
			"sku":           p.SKU,
			"slug":          p.Slug,
			"name":          p.Name,
			"description":   p.Description,
			"price":         p.Price,
			"currency":      p.Currency,
			"category":      p.Category,
			"category_id":   p.CategoryID,
			"image_url":     p.ImageURL,
			"image_urls":    p.ImageURLs,
			"stock_qty":     p.StockQty,
			"reorder_point": p.ReorderPoint,
			"is_active":     p.IsActive,
			"sizes":         p.Sizes,
			"branch_slugs":  p.BranchSlugs,
			"updated_at":    time.Now(),
		},
	}

	opts := options.FindOneAndUpdate().SetReturnDocument(options.After)
	var out models.Product
	if err := r.products.FindOneAndUpdate(ctx, bson.M{"_id": oid}, update, opts).Decode(&out); err != nil {
		return nil, err
	}

	return &out, nil
}

func (r *productRepository) Delete(ctx context.Context, id string) error {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return err
	}
	_, err = r.products.DeleteOne(ctx, bson.M{"_id": oid})
	return err
}

func (r *productRepository) DecrementStock(ctx context.Context, productID string, qty int) error {
	oid, err := primitive.ObjectIDFromHex(productID)
	if err != nil {
		return err
	}
	_, err = r.products.UpdateOne(ctx,
		bson.M{"_id": oid},
		bson.M{
			"$inc": bson.M{"stock_qty": -qty},
			"$set": bson.M{"updated_at": time.Now()},
		},
	)
	return err
}

func (r *productRepository) IncrementStock(ctx context.Context, productID string, qty int) error {
	oid, err := primitive.ObjectIDFromHex(productID)
	if err != nil {
		return err
	}
	_, err = r.products.UpdateOne(ctx,
		bson.M{"_id": oid},
		bson.M{
			"$inc": bson.M{"stock_qty": qty},
			"$set": bson.M{"updated_at": time.Now()},
		},
	)
	return err
}

func (r *productRepository) UpsertByExternalOrSlug(ctx context.Context, p models.Product) (*models.Product, error) {
	now := time.Now()
	filter := bson.M{"slug": p.Slug}
	if p.ExternalID != "" {
		filter = bson.M{"$or": []bson.M{
			{"external_id": p.ExternalID},
			{"slug": p.Slug},
		}}
	}

	update := bson.M{
		"$set": bson.M{
			"external_id":  p.ExternalID,
			"sku":          p.SKU,
			"slug":         p.Slug,
			"name":         p.Name,
			"description":  p.Description,
			"price":        p.Price,
			"currency":     p.Currency,
			"category":     p.Category,
			"image_url":    p.ImageURL,
			"stock_qty":    p.StockQty,
			"is_active":    p.IsActive,
			"branch_slugs": p.BranchSlugs,
			"updated_at":   now,
		},
		"$setOnInsert": bson.M{
			"_id":         primitive.NewObjectID(),
			"category_id": primitive.NilObjectID,
			"created_at":  now,
		},
	}

	opts := options.FindOneAndUpdate().SetUpsert(true).SetReturnDocument(options.After)
	var out models.Product
	if err := r.products.FindOneAndUpdate(ctx, filter, update, opts).Decode(&out); err != nil {
		return nil, err
	}

	return &out, nil
}
