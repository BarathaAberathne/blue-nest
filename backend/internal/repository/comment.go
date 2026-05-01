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

type CommentRepository interface {
	Create(ctx context.Context, c *models.Comment) error
	FindByPostSlug(ctx context.Context, slug string) ([]models.Comment, error)
}

type commentRepository struct {
	col *mongo.Collection
}

func NewCommentRepository(db *mongo.Database) CommentRepository {
	return &commentRepository{col: db.Collection("blog_comments")}
}

func (r *commentRepository) Create(ctx context.Context, c *models.Comment) error {
	c.ID = primitive.NewObjectID()
	c.CreatedAt = time.Now()
	_, err := r.col.InsertOne(ctx, c)
	return err
}

func (r *commentRepository) FindByPostSlug(ctx context.Context, slug string) ([]models.Comment, error) {
	opts := options.Find().SetSort(bson.D{{Key: "created_at", Value: 1}})
	cursor, err := r.col.Find(ctx, bson.M{"post_slug": slug}, opts)
	if err != nil {
		return nil, err
	}
	results := make([]models.Comment, 0)
	return results, cursor.All(ctx, &results)
}
