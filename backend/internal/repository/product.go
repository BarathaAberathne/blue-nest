package repository

import (
	"context"
	"time"

	"github.com/blue-nest-montessori/api/internal/models"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

type ProductRepository interface {
	FindAll(ctx context.Context) ([]models.Product, error)
	FindByID(ctx context.Context, id string) (*models.Product, error)
	FindAllCategories(ctx context.Context) ([]models.Category, error)
	Create(ctx context.Context, p models.Product) (*models.Product, error)
	Update(ctx context.Context, id string, p models.Product) (*models.Product, error)
	Delete(ctx context.Context, id string) error
}

type productRepository struct {
	products   *mongo.Collection
	categories *mongo.Collection
}

func NewProductRepository(db *mongo.Database) ProductRepository {
	return &productRepository{
		products:   db.Collection("products"),
		categories: db.Collection("categories"),
	}
}

func (r *productRepository) FindAll(ctx context.Context) ([]models.Product, error) {
	cursor, err := r.products.Find(ctx, bson.M{"is_active": true})
	if err != nil {
		return nil, err
	}
	var results []models.Product
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

func (r *productRepository) FindAllCategories(ctx context.Context) ([]models.Category, error) {
	cursor, err := r.categories.Find(ctx, bson.M{})
	if err != nil {
		return nil, err
	}
	var results []models.Category
	return results, cursor.All(ctx, &results)
}

func (r *productRepository) Create(ctx context.Context, p models.Product) (*models.Product, error) {
	p.ID = primitive.NewObjectID()
	p.CreatedAt = time.Now()
	p.UpdatedAt = time.Now()
	_, err := r.products.InsertOne(ctx, p)
	return &p, err
}

func (r *productRepository) Update(ctx context.Context, id string, p models.Product) (*models.Product, error) {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, err
	}
	p.UpdatedAt = time.Now()
	_, err = r.products.ReplaceOne(ctx, bson.M{"_id": oid}, p)
	return &p, err
}

func (r *productRepository) Delete(ctx context.Context, id string) error {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return err
	}
	_, err = r.products.DeleteOne(ctx, bson.M{"_id": oid})
	return err
}
