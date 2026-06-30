package repository

import (
	"context"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// CounterRepository hands out monotonically increasing sequence numbers, used to
// mint human-readable references like SR-2026-000045 / PO-2026-000123. Each
// named counter (e.g. "order_request-2026") is a single document atomically
// incremented via findOneAndUpdate+upsert, so concurrent requests never collide.
type CounterRepository interface {
	Next(ctx context.Context, name string) (int64, error)
}

type counterRepository struct {
	col *mongo.Collection
}

func NewCounterRepository(db *mongo.Database) CounterRepository {
	return &counterRepository{col: db.Collection("counters")}
}

func (r *counterRepository) Next(ctx context.Context, name string) (int64, error) {
	opts := options.FindOneAndUpdate().SetUpsert(true).SetReturnDocument(options.After)
	var res struct {
		Seq int64 `bson:"seq"`
	}
	err := r.col.FindOneAndUpdate(ctx,
		bson.M{"_id": name},
		bson.M{"$inc": bson.M{"seq": int64(1)}},
		opts,
	).Decode(&res)
	if err != nil {
		return 0, err
	}
	return res.Seq, nil
}
