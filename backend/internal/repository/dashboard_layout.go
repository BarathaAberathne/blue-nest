package repository

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/blue-nest-montessori/api/internal/models"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type DashboardLayoutRepository interface {
	// FindByUserID returns all of a user's saved layouts (active first).
	FindByUserID(ctx context.Context, userID string) ([]models.DashboardLayout, error)
	// FindActive returns the user's active layout, or (nil, nil) when they have none.
	FindActive(ctx context.Context, userID string) (*models.DashboardLayout, error)
	// Save upserts a named layout by (user, name). When makeActive is true it also
	// becomes the sole active layout.
	Save(ctx context.Context, userID, name string, widgets []models.DashboardWidget, makeActive bool) (*models.DashboardLayout, error)
	// SetActive flags the named layout active and clears the flag on the rest.
	SetActive(ctx context.Context, userID, name string) (*models.DashboardLayout, error)
	// Delete removes a named layout. Returns the name of the layout that is active
	// afterwards (empty when the user has none left).
	Delete(ctx context.Context, userID, name string) (string, error)
}

type dashboardLayoutRepository struct {
	col *TenantCollection
}

func NewDashboardLayoutRepository(db *mongo.Database) DashboardLayoutRepository {
	col := db.Collection("dashboard_layouts")
	// One layout per (user, name).
	_, _ = col.Indexes().CreateOne(context.Background(), mongo.IndexModel{
		Keys:    bson.D{{Key: "user_id", Value: 1}, {Key: "name", Value: 1}},
		Options: options.Index().SetUnique(true),
	})
	return &dashboardLayoutRepository{col: NewTenantCollectionFrom(col)}
}

func (r *dashboardLayoutRepository) FindByUserID(ctx context.Context, userID string) ([]models.DashboardLayout, error) {
	oid, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		return nil, err
	}
	// Active first, then most-recently-updated.
	opts := options.Find().SetSort(bson.D{{Key: "active", Value: -1}, {Key: "updated_at", Value: -1}})
	cur, err := r.col.Find(ctx, bson.M{"user_id": oid}, opts)
	if err != nil {
		return nil, err
	}
	var out []models.DashboardLayout
	if err := cur.All(ctx, &out); err != nil {
		return nil, err
	}
	return out, nil
}

func (r *dashboardLayoutRepository) FindActive(ctx context.Context, userID string) (*models.DashboardLayout, error) {
	oid, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		return nil, err
	}
	var l models.DashboardLayout
	err = r.col.FindOne(ctx, bson.M{"user_id": oid, "active": true}).Decode(&l)
	if errors.Is(err, mongo.ErrNoDocuments) {
		// Fall back to any layout (legacy docs predate the active flag).
		err = r.col.FindOne(ctx, bson.M{"user_id": oid}).Decode(&l)
		if errors.Is(err, mongo.ErrNoDocuments) {
			return nil, nil
		}
	}
	if err != nil {
		return nil, err
	}
	return &l, nil
}

// clearActive unsets the active flag on all of a user's layouts.
func (r *dashboardLayoutRepository) clearActive(ctx context.Context, oid primitive.ObjectID) error {
	_, err := r.col.UpdateMany(ctx, bson.M{"user_id": oid, "active": true}, bson.M{"$set": bson.M{"active": false}})
	return err
}

func (r *dashboardLayoutRepository) Save(ctx context.Context, userID, name string, widgets []models.DashboardWidget, makeActive bool) (*models.DashboardLayout, error) {
	oid, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		return nil, err
	}
	name = strings.TrimSpace(name)
	if name == "" {
		name = models.DefaultLayoutName
	}
	if widgets == nil {
		widgets = []models.DashboardWidget{}
	}
	if makeActive {
		if err := r.clearActive(ctx, oid); err != nil {
			return nil, err
		}
	}
	update := bson.M{
		"$set":         bson.M{"widgets": widgets, "updated_at": time.Now(), "active": makeActive},
		"$setOnInsert": bson.M{"user_id": oid, "name": name},
	}
	opts := options.FindOneAndUpdate().SetUpsert(true).SetReturnDocument(options.After)
	var out models.DashboardLayout
	if err := r.col.FindOneAndUpdate(ctx, bson.M{"user_id": oid, "name": name}, update, opts).Decode(&out); err != nil {
		return nil, err
	}
	return &out, nil
}

func (r *dashboardLayoutRepository) SetActive(ctx context.Context, userID, name string) (*models.DashboardLayout, error) {
	oid, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		return nil, err
	}
	if err := r.clearActive(ctx, oid); err != nil {
		return nil, err
	}
	update := bson.M{"$set": bson.M{"active": true, "updated_at": time.Now()}}
	opts := options.FindOneAndUpdate().SetReturnDocument(options.After)
	var out models.DashboardLayout
	err = r.col.FindOneAndUpdate(ctx, bson.M{"user_id": oid, "name": name}, update, opts).Decode(&out)
	if errors.Is(err, mongo.ErrNoDocuments) {
		return nil, errors.New("layout not found")
	}
	if err != nil {
		return nil, err
	}
	return &out, nil
}

func (r *dashboardLayoutRepository) Delete(ctx context.Context, userID, name string) (string, error) {
	oid, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		return "", err
	}
	var deleted models.DashboardLayout
	err = r.col.FindOneAndDelete(ctx, bson.M{"user_id": oid, "name": name}).Decode(&deleted)
	if errors.Is(err, mongo.ErrNoDocuments) {
		return "", errors.New("layout not found")
	}
	if err != nil {
		return "", err
	}
	// If we removed the active layout, promote another one so the user keeps a default.
	if deleted.Active {
		var next models.DashboardLayout
		opts := options.FindOneAndUpdate().SetSort(bson.D{{Key: "updated_at", Value: -1}}).SetReturnDocument(options.After)
		err = r.col.FindOneAndUpdate(ctx, bson.M{"user_id": oid}, bson.M{"$set": bson.M{"active": true}}, opts).Decode(&next)
		if errors.Is(err, mongo.ErrNoDocuments) {
			return "", nil
		}
		if err != nil {
			return "", err
		}
		return next.Name, nil
	}
	active, err := r.FindActive(ctx, userID)
	if err != nil || active == nil {
		return "", err
	}
	return active.Name, nil
}
