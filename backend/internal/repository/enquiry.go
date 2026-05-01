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

type EnquiryRepository interface {
	Create(ctx context.Context, e *models.Enquiry) error
	FindAll(ctx context.Context) ([]models.Enquiry, error)
	UpdateStatus(ctx context.Context, id, status string) error
}

type enquiryRepository struct {
	col *mongo.Collection
}

func NewEnquiryRepository(db *mongo.Database) EnquiryRepository {
	return &enquiryRepository{col: db.Collection("enquiries")}
}

func (r *enquiryRepository) Create(ctx context.Context, e *models.Enquiry) error {
	e.ID = primitive.NewObjectID()
	e.CreatedAt = time.Now()
	_, err := r.col.InsertOne(ctx, e)
	return err
}

func (r *enquiryRepository) FindAll(ctx context.Context) ([]models.Enquiry, error) {
	opts := options.Find().SetSort(bson.D{{Key: "created_at", Value: -1}})
	cursor, err := r.col.Find(ctx, bson.M{}, opts)
	if err != nil {
		return nil, err
	}
	results := make([]models.Enquiry, 0)
	return results, cursor.All(ctx, &results)
}

func (r *enquiryRepository) UpdateStatus(ctx context.Context, id, status string) error {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return err
	}
	_, err = r.col.UpdateOne(ctx, bson.M{"_id": oid}, bson.M{"$set": bson.M{"status": status}})
	return err
}
