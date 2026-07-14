package repository

import (
	"context"
	"time"

	"github.com/blue-nest-montessori/api/internal/models"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// GBPRepository stores Google Business Profile digest snapshots (history for
// trends) and individual reviews, both keyed by branch_slug.
type GBPRepository interface {
	UpsertDigest(ctx context.Context, d models.BranchDigest) error
	LatestDigest(ctx context.Context, branch string) (*models.BranchDigest, error)
	TrendDigests(ctx context.Context, branch string, limit int64) ([]models.BranchDigest, error)
	UpsertReview(ctx context.Context, r models.GBPReview) error
	FindReviews(ctx context.Context, branch string, limit int64) ([]models.GBPReview, error)
	CountPendingReplies(ctx context.Context, branch string) (int, error)
}

type gbpRepository struct {
	digests *mongo.Collection
	reviews *mongo.Collection
}

func NewGBPRepository(db *mongo.Database) GBPRepository {
	return &gbpRepository{digests: db.Collection("branch_digests"), reviews: db.Collection("branch_reviews")}
}

func (r *gbpRepository) UpsertDigest(ctx context.Context, d models.BranchDigest) error {
	d.CreatedAt = time.Now()
	_, err := r.digests.UpdateOne(ctx,
		bson.M{"branch_slug": d.BranchSlug, "date": d.Date},
		bson.M{"$set": bson.M{
			"rating": d.Rating, "review_count": d.ReviewCount, "insights": d.Insights,
			"keywords": d.Keywords, "sentiment": d.Sentiment, "source": d.Source, "created_at": d.CreatedAt,
		}},
		options.Update().SetUpsert(true),
	)
	return err
}

func (r *gbpRepository) LatestDigest(ctx context.Context, branch string) (*models.BranchDigest, error) {
	opts := options.FindOne().SetSort(bson.D{{Key: "date", Value: -1}})
	var d models.BranchDigest
	err := r.digests.FindOne(ctx, bson.M{"branch_slug": branch}, opts).Decode(&d)
	if err == mongo.ErrNoDocuments {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &d, nil
}

func (r *gbpRepository) TrendDigests(ctx context.Context, branch string, limit int64) ([]models.BranchDigest, error) {
	opts := options.Find().SetSort(bson.D{{Key: "date", Value: 1}}).SetLimit(limit)
	cursor, err := r.digests.Find(ctx, bson.M{"branch_slug": branch}, opts)
	if err != nil {
		return nil, err
	}
	out := make([]models.BranchDigest, 0)
	return out, cursor.All(ctx, &out)
}

func (r *gbpRepository) UpsertReview(ctx context.Context, rv models.GBPReview) error {
	now := time.Now()
	rv.UpdatedAt = now
	key := bson.M{"branch_slug": rv.BranchSlug, "review_id": rv.ReviewID}
	_, err := r.reviews.UpdateOne(ctx, key,
		bson.M{
			"$set": bson.M{
				"author": rv.Author, "rating": rv.Rating, "text": rv.Text, "date": rv.Date,
				"reply": rv.Reply, "sentiment": rv.Sentiment, "updated_at": now,
			},
			"$setOnInsert": bson.M{"created_at": now},
		},
		options.Update().SetUpsert(true),
	)
	return err
}

func (r *gbpRepository) FindReviews(ctx context.Context, branch string, limit int64) ([]models.GBPReview, error) {
	filter := bson.M{}
	if branch != "" {
		filter["branch_slug"] = branch
	}
	opts := options.Find().SetSort(bson.D{{Key: "date", Value: -1}})
	if limit > 0 {
		opts.SetLimit(limit)
	}
	cursor, err := r.reviews.Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	out := make([]models.GBPReview, 0)
	return out, cursor.All(ctx, &out)
}

func (r *gbpRepository) CountPendingReplies(ctx context.Context, branch string) (int, error) {
	filter := bson.M{"$or": bson.A{bson.M{"reply": ""}, bson.M{"reply": bson.M{"$exists": false}}}}
	if branch != "" {
		filter["branch_slug"] = branch
	}
	n, err := r.reviews.CountDocuments(ctx, filter)
	return int(n), err
}
