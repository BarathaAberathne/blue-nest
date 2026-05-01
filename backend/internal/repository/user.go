package repository

import (
	"context"

	"github.com/blue-nest-montessori/api/internal/models"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

type UserRepository interface {
	Create(ctx context.Context, user *models.User) error
	FindByEmail(ctx context.Context, email string) (*models.User, error)
	FindByID(ctx context.Context, id string) (*models.User, error)
	FindByRoles(ctx context.Context, roles []models.Role) ([]models.User, error)
}

type userRepository struct {
	col *mongo.Collection
}

func NewUserRepository(db *mongo.Database) UserRepository {
	return &userRepository{col: db.Collection("users")}
}

func (r *userRepository) Create(ctx context.Context, user *models.User) error {
	_, err := r.col.InsertOne(ctx, user)
	return err
}

func (r *userRepository) FindByEmail(ctx context.Context, email string) (*models.User, error) {
	var user models.User
	err := r.col.FindOne(ctx, bson.M{"email": email}).Decode(&user)
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *userRepository) FindByID(ctx context.Context, id string) (*models.User, error) {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, err
	}

	var user models.User
	err = r.col.FindOne(ctx, bson.M{"_id": oid}).Decode(&user)
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *userRepository) FindByRoles(ctx context.Context, roles []models.Role) ([]models.User, error) {
	if len(roles) == 0 {
		return []models.User{}, nil
	}

	in := make([]string, 0, len(roles))
	for _, role := range roles {
		in = append(in, string(role))
	}

	cursor, err := r.col.Find(ctx, bson.M{"role": bson.M{"$in": in}})
	if err != nil {
		return nil, err
	}

	users := make([]models.User, 0)
	return users, cursor.All(ctx, &users)
}
