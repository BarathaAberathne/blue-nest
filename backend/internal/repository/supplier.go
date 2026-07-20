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

type SupplierRepository interface {
	Create(ctx context.Context, s *models.Supplier) error
	FindAll(ctx context.Context) ([]models.Supplier, error)
	FindByID(ctx context.Context, id string) (*models.Supplier, error)
	Update(ctx context.Context, id string, s models.Supplier) (*models.Supplier, error)
	Delete(ctx context.Context, id string) error
}

type supplierRepository struct {
	col *TenantCollection
}

func NewSupplierRepository(db *mongo.Database) SupplierRepository {
	return &supplierRepository{col: NewTenantCollection(db, "suppliers")}
}

func (r *supplierRepository) Create(ctx context.Context, s *models.Supplier) error {
	s.ID = primitive.NewObjectID()
	now := time.Now()
	s.CreatedAt = now
	s.UpdatedAt = now
	_, err := r.col.InsertOne(ctx, s)
	return err
}

func (r *supplierRepository) FindAll(ctx context.Context) ([]models.Supplier, error) {
	opts := options.Find().SetSort(bson.D{{Key: "name", Value: 1}})
	cursor, err := r.col.Find(ctx, bson.M{}, opts)
	if err != nil {
		return nil, err
	}
	results := make([]models.Supplier, 0)
	return results, cursor.All(ctx, &results)
}

func (r *supplierRepository) FindByID(ctx context.Context, id string) (*models.Supplier, error) {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, err
	}
	var s models.Supplier
	if err = r.col.FindOne(ctx, bson.M{"_id": oid}).Decode(&s); err != nil {
		return nil, err
	}
	return &s, nil
}

func (r *supplierRepository) Update(ctx context.Context, id string, s models.Supplier) (*models.Supplier, error) {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, err
	}
	update := bson.M{"$set": bson.M{
		"name":           s.Name,
		"slug":           s.Slug,
		"category":       s.Category,
		"contact_name":   s.ContactName,
		"contact_email":  s.ContactEmail,
		"contact_phone":  s.ContactPhone,
		"website":        s.Website,
		"order_email":    s.OrderEmail,
		"account_ref":    s.AccountRef,
		"lead_time_days": s.LeadTimeDays,
		"notes":          s.Notes,
		"is_active":      s.IsActive,
		"updated_at":     time.Now(),
	}}
	opts := options.FindOneAndUpdate().SetReturnDocument(options.After)
	var out models.Supplier
	if err := r.col.FindOneAndUpdate(ctx, bson.M{"_id": oid}, update, opts).Decode(&out); err != nil {
		return nil, err
	}
	return &out, nil
}

func (r *supplierRepository) Delete(ctx context.Context, id string) error {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return err
	}
	_, err = r.col.DeleteOne(ctx, bson.M{"_id": oid})
	return err
}
