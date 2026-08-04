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

type LeaveRequestRepository interface {
	Create(ctx context.Context, req *models.LeaveRequest) error
	FindAll(ctx context.Context) ([]models.LeaveRequest, error)
	FindByStaffID(ctx context.Context, staffID string) ([]models.LeaveRequest, error)
	FindByID(ctx context.Context, id string) (*models.LeaveRequest, error)
	Update(ctx context.Context, req *models.LeaveRequest) error
}

type leaveRequestRepository struct {
	col *TenantCollection
}

func NewLeaveRequestRepository(db *mongo.Database) LeaveRequestRepository {
	return &leaveRequestRepository{col: NewTenantCollection(db, "leave_requests")}
}

func (r *leaveRequestRepository) Create(ctx context.Context, req *models.LeaveRequest) error {
	req.ID = primitive.NewObjectID()
	now := time.Now()
	req.CreatedAt = now
	req.UpdatedAt = now
	_, err := r.col.InsertOne(ctx, req)
	return err
}

func (r *leaveRequestRepository) FindAll(ctx context.Context) ([]models.LeaveRequest, error) {
	opts := options.Find().SetSort(bson.D{{Key: "created_at", Value: -1}})
	cursor, err := r.col.Find(ctx, bson.M{}, opts)
	if err != nil {
		return nil, err
	}
	results := make([]models.LeaveRequest, 0)
	return results, cursor.All(ctx, &results)
}

func (r *leaveRequestRepository) FindByStaffID(ctx context.Context, staffID string) ([]models.LeaveRequest, error) {
	opts := options.Find().SetSort(bson.D{{Key: "created_at", Value: -1}})
	cursor, err := r.col.Find(ctx, bson.M{"staff_id": staffID}, opts)
	if err != nil {
		return nil, err
	}
	results := make([]models.LeaveRequest, 0)
	return results, cursor.All(ctx, &results)
}

func (r *leaveRequestRepository) FindByID(ctx context.Context, id string) (*models.LeaveRequest, error) {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, err
	}
	var lr models.LeaveRequest
	if err := r.col.FindOne(ctx, bson.M{"_id": oid}).Decode(&lr); err != nil {
		return nil, err
	}
	return &lr, nil
}

func (r *leaveRequestRepository) Update(ctx context.Context, req *models.LeaveRequest) error {
	req.UpdatedAt = time.Now()
	_, err := r.col.UpdateOne(ctx, bson.M{"_id": req.ID}, bson.M{"$set": bson.M{
		"status":         req.Status,
		"reviewed_by_id": req.ReviewedByID,
		"reviewed_by":    req.ReviewedBy,
		"reviewed_at":    req.ReviewedAt,
		"decline_reason": req.DeclineReason,
		"updated_at":     req.UpdatedAt,
	}})
	return err
}
