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

type BlogRepository interface {
	FindPublished(ctx context.Context) ([]models.BlogPost, error)
	FindAll(ctx context.Context) ([]models.BlogPost, error)
	FindBySlug(ctx context.Context, slug string) (*models.BlogPost, error)
	FindScheduledDue(ctx context.Context) ([]models.BlogPost, error)
	Publish(ctx context.Context, id string) error
	Create(ctx context.Context, post models.BlogPost) (*models.BlogPost, error)
	Update(ctx context.Context, id string, post models.BlogPost) (*models.BlogPost, error)
	Delete(ctx context.Context, id string) error
	IncrementLike(ctx context.Context, slug string) (int64, error)
}

type blogRepository struct {
	col *TenantCollection
}

func NewBlogRepository(db *mongo.Database) BlogRepository {
	return &blogRepository{col: NewTenantCollection(db, "blog_posts")}
}

func (r *blogRepository) FindPublished(ctx context.Context) ([]models.BlogPost, error) {
	cursor, err := r.col.Find(ctx, bson.M{"published": true})
	if err != nil {
		return nil, err
	}
	results := make([]models.BlogPost, 0)
	return results, cursor.All(ctx, &results)
}

func (r *blogRepository) FindAll(ctx context.Context) ([]models.BlogPost, error) {
	cursor, err := r.col.Find(ctx, bson.M{})
	if err != nil {
		return nil, err
	}
	results := make([]models.BlogPost, 0)
	return results, cursor.All(ctx, &results)
}

func (r *blogRepository) FindBySlug(ctx context.Context, slug string) (*models.BlogPost, error) {
	var post models.BlogPost
	if err := r.col.FindOne(ctx, bson.M{"slug": slug, "published": true}).Decode(&post); err != nil {
		return nil, err
	}
	return &post, nil
}

func (r *blogRepository) FindScheduledDue(ctx context.Context) ([]models.BlogPost, error) {
	filter := bson.M{
		"published": false,
		"scheduled_at": bson.M{
			"$ne":  nil,
			"$lte": time.Now(),
		},
	}
	cursor, err := r.col.Find(ctx, filter)
	if err != nil {
		return nil, err
	}
	results := make([]models.BlogPost, 0)
	return results, cursor.All(ctx, &results)
}

func (r *blogRepository) Publish(ctx context.Context, id string) error {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return err
	}
	now := time.Now()
	_, err = r.col.UpdateOne(ctx,
		bson.M{"_id": oid},
		bson.M{"$set": bson.M{
			"published":    true,
			"published_at": now,
			"updated_at":   now,
		}},
	)
	return err
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

	update := bson.M{
		"$set": bson.M{
			"slug":           post.Slug,
			"title":          post.Title,
			"excerpt":        post.Excerpt,
			"body":           post.Body,
			"author_id":      post.AuthorID,
			"author_name":    post.AuthorName,
			"cover_image":    post.CoverImage,
			"gallery_images": post.GalleryImages,
			"tags":           post.Tags,
			"branch_slugs":   post.BranchSlugs,
			"published":      post.Published,
			"published_at":   post.PublishedAt,
			"scheduled_at":   post.ScheduledAt,
			"updated_at":     time.Now(),
		},
	}

	opts := options.FindOneAndUpdate().SetReturnDocument(options.After)
	var out models.BlogPost
	if err := r.col.FindOneAndUpdate(ctx, bson.M{"_id": oid}, update, opts).Decode(&out); err != nil {
		return nil, err
	}
	return &out, nil
}

func (r *blogRepository) Delete(ctx context.Context, id string) error {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return err
	}
	_, err = r.col.DeleteOne(ctx, bson.M{"_id": oid})
	return err
}

func (r *blogRepository) IncrementLike(ctx context.Context, slug string) (int64, error) {
	opts := options.FindOneAndUpdate().SetReturnDocument(options.After)
	var post models.BlogPost
	err := r.col.FindOneAndUpdate(
		ctx,
		bson.M{"slug": slug, "published": true},
		bson.M{"$inc": bson.M{"like_count": 1}},
		opts,
	).Decode(&post)
	if err != nil {
		return 0, err
	}
	return post.LikeCount, nil
}
