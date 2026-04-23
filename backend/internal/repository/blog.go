package repository

import (
	"context"
	"time"

	"github.com/blue-nest-montessori/api/internal/models"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

type BlogRepository interface {
	FindPublished(ctx context.Context) ([]models.BlogPost, error)
	FindAll(ctx context.Context) ([]models.BlogPost, error)
	FindBySlug(ctx context.Context, slug string) (*models.BlogPost, error)
	Create(ctx context.Context, post models.BlogPost) (*models.BlogPost, error)
	Update(ctx context.Context, id string, post models.BlogPost) (*models.BlogPost, error)
}

type blogRepository struct {
	col *mongo.Collection
}

func NewBlogRepository(db *mongo.Database) BlogRepository {
	return &blogRepository{col: db.Collection("blog_posts")}
}

func (r *blogRepository) FindPublished(ctx context.Context) ([]models.BlogPost, error) {
	cursor, err := r.col.Find(ctx, bson.M{"published": true})
	if err != nil {
		return nil, err
	}
	var results []models.BlogPost
	return results, cursor.All(ctx, &results)
}

func (r *blogRepository) FindAll(ctx context.Context) ([]models.BlogPost, error) {
	cursor, err := r.col.Find(ctx, bson.M{})
	if err != nil {
		return nil, err
	}
	var results []models.BlogPost
	return results, cursor.All(ctx, &results)
}

func (r *blogRepository) FindBySlug(ctx context.Context, slug string) (*models.BlogPost, error) {
	var post models.BlogPost
	if err := r.col.FindOne(ctx, bson.M{"slug": slug, "published": true}).Decode(&post); err != nil {
		return nil, err
	}
	return &post, nil
}

func (r *blogRepository) Create(ctx context.Context, post models.BlogPost) (*models.BlogPost, error) {
	post.ID = primitive.NewObjectID()
	post.CreatedAt = time.Now()
	post.UpdatedAt = time.Now()
	_, err := r.col.InsertOne(ctx, post)
	return &post, err
}

func (r *blogRepository) Update(ctx context.Context, id string, post models.BlogPost) (*models.BlogPost, error) {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, err
	}
	post.UpdatedAt = time.Now()
	_, err = r.col.ReplaceOne(ctx, bson.M{"_id": oid}, post)
	return &post, err
}
