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

type RoomRepository interface {
	Create(ctx context.Context, r *models.Room) error
	FindAll(ctx context.Context, branch string) ([]models.Room, error)
	FindByID(ctx context.Context, id string) (*models.Room, error)
	Update(ctx context.Context, id string, r models.Room) (*models.Room, error)
	Delete(ctx context.Context, id string) error
}

type roomRepository struct {
	col *TenantCollection
}

func NewRoomRepository(db *mongo.Database) RoomRepository {
	return &roomRepository{col: NewTenantCollection(db, "rooms")}
}

func (r *roomRepository) Create(ctx context.Context, room *models.Room) error {
	room.ID = primitive.NewObjectID()
	now := time.Now()
	room.CreatedAt = now
	room.UpdatedAt = now
	_, err := r.col.InsertOne(ctx, room)
	return err
}

func (r *roomRepository) FindAll(ctx context.Context, branch string) ([]models.Room, error) {
	filter := bson.M{}
	if branch != "" {
		filter["branch_slug"] = branch
	}
	opts := options.Find().SetSort(bson.D{{Key: "branch_slug", Value: 1}, {Key: "name", Value: 1}})
	cursor, err := r.col.Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	out := make([]models.Room, 0)
	return out, cursor.All(ctx, &out)
}

func (r *roomRepository) FindByID(ctx context.Context, id string) (*models.Room, error) {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, err
	}
	var room models.Room
	if err = r.col.FindOne(ctx, bson.M{"_id": oid}).Decode(&room); err != nil {
		return nil, err
	}
	return &room, nil
}

func (r *roomRepository) Update(ctx context.Context, id string, room models.Room) (*models.Room, error) {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, err
	}
	update := bson.M{"$set": bson.M{
		"branch_slug": room.BranchSlug,
		"name":        room.Name,
		"age_range":   room.AgeRange,
		"capacity":    room.Capacity,
		"staff_ratio": room.StaffRatio,
		"updated_at":  time.Now(),
	}}
	opts := options.FindOneAndUpdate().SetReturnDocument(options.After)
	var out models.Room
	if err := r.col.FindOneAndUpdate(ctx, bson.M{"_id": oid}, update, opts).Decode(&out); err != nil {
		return nil, err
	}
	return &out, nil
}

func (r *roomRepository) Delete(ctx context.Context, id string) error {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return err
	}
	_, err = r.col.DeleteOne(ctx, bson.M{"_id": oid})
	return err
}
