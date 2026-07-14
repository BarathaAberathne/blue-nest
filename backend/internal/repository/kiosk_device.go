package repository

import (
	"context"
	"errors"
	"time"

	"github.com/blue-nest-montessori/api/internal/models"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type KioskDeviceRepository interface {
	Create(ctx context.Context, d *models.KioskDevice) error
	FindAll(ctx context.Context, branch string) ([]models.KioskDevice, error)
	FindActive(ctx context.Context) ([]models.KioskDevice, error)
	FindByID(ctx context.Context, id string) (*models.KioskDevice, error)
	SetActive(ctx context.Context, id string, active bool) error
	Delete(ctx context.Context, id string) error
	TouchLastSeen(ctx context.Context, id string) error
}

type kioskDeviceRepository struct {
	col *mongo.Collection
}

func NewKioskDeviceRepository(db *mongo.Database) KioskDeviceRepository {
	return &kioskDeviceRepository{col: db.Collection("kiosk_devices")}
}

func (r *kioskDeviceRepository) Create(ctx context.Context, d *models.KioskDevice) error {
	d.ID = primitive.NewObjectID()
	now := time.Now()
	d.CreatedAt, d.UpdatedAt = now, now
	_, err := r.col.InsertOne(ctx, d)
	return err
}

func (r *kioskDeviceRepository) FindAll(ctx context.Context, branch string) ([]models.KioskDevice, error) {
	filter := bson.M{}
	if branch != "" {
		filter["branch_slug"] = branch
	}
	cur, err := r.col.Find(ctx, filter, options.Find().SetSort(bson.D{{Key: "created_at", Value: -1}}))
	if err != nil {
		return nil, err
	}
	var out []models.KioskDevice
	if err := cur.All(ctx, &out); err != nil {
		return nil, err
	}
	return out, nil
}

// FindActive returns every active device (the kiosk auth path checks the token
// against each active device's hash).
func (r *kioskDeviceRepository) FindActive(ctx context.Context) ([]models.KioskDevice, error) {
	cur, err := r.col.Find(ctx, bson.M{"active": true})
	if err != nil {
		return nil, err
	}
	var out []models.KioskDevice
	if err := cur.All(ctx, &out); err != nil {
		return nil, err
	}
	return out, nil
}

func (r *kioskDeviceRepository) FindByID(ctx context.Context, id string) (*models.KioskDevice, error) {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, err
	}
	var d models.KioskDevice
	if err := r.col.FindOne(ctx, bson.M{"_id": oid}).Decode(&d); err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return nil, errors.New("device not found")
		}
		return nil, err
	}
	return &d, nil
}

func (r *kioskDeviceRepository) SetActive(ctx context.Context, id string, active bool) error {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return err
	}
	_, err = r.col.UpdateOne(ctx, bson.M{"_id": oid}, bson.M{"$set": bson.M{"active": active, "updated_at": time.Now()}})
	return err
}

func (r *kioskDeviceRepository) Delete(ctx context.Context, id string) error {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return err
	}
	_, err = r.col.DeleteOne(ctx, bson.M{"_id": oid})
	return err
}

func (r *kioskDeviceRepository) TouchLastSeen(ctx context.Context, id string) error {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return err
	}
	now := time.Now()
	_, err = r.col.UpdateOne(ctx, bson.M{"_id": oid}, bson.M{"$set": bson.M{"last_seen_at": now, "updated_at": now}})
	return err
}
