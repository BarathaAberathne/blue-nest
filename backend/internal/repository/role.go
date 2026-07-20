package repository

import (
	"context"
	"time"

	"github.com/blue-nest-montessori/api/internal/models"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// RoleRepository stores editable role→permission definitions (Phase B3).
type RoleRepository interface {
	FindAll(ctx context.Context) ([]models.RoleDefinition, error)
	FindByName(ctx context.Context, name string) (*models.RoleDefinition, error)
	Upsert(ctx context.Context, def models.RoleDefinition) error
	Delete(ctx context.Context, name string) error
}

type roleRepository struct {
	col *TenantCollection
}

func NewRoleRepository(db *mongo.Database) RoleRepository {
	return &roleRepository{col: NewTenantCollection(db, "roles")}
}

func (r *roleRepository) FindAll(ctx context.Context) ([]models.RoleDefinition, error) {
	cursor, err := r.col.Find(ctx, bson.M{})
	if err != nil {
		return nil, err
	}
	out := make([]models.RoleDefinition, 0)
	return out, cursor.All(ctx, &out)
}

func (r *roleRepository) FindByName(ctx context.Context, name string) (*models.RoleDefinition, error) {
	var def models.RoleDefinition
	if err := r.col.FindOne(ctx, bson.M{"name": name}).Decode(&def); err != nil {
		return nil, err
	}
	return &def, nil
}

func (r *roleRepository) Upsert(ctx context.Context, def models.RoleDefinition) error {
	now := time.Now()
	_, err := r.col.UpdateOne(ctx,
		bson.M{"name": def.Name},
		bson.M{
			"$set":         bson.M{"label": def.Label, "permissions": def.Permissions, "is_custom": def.IsCustom, "dashboard": def.Dashboard, "updated_at": now},
			"$setOnInsert": bson.M{"name": def.Name, "created_at": now},
		},
		options.Update().SetUpsert(true),
	)
	return err
}

func (r *roleRepository) Delete(ctx context.Context, name string) error {
	_, err := r.col.DeleteOne(ctx, bson.M{"name": name})
	return err
}
