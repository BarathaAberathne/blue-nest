package repository

import (
	"context"
	"log/slog"
	"time"

	"github.com/blue-nest-montessori/api/internal/models"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type UserRepository interface {
	Create(ctx context.Context, user *models.User) error
	FindByEmail(ctx context.Context, email string) (*models.User, error)
	FindByID(ctx context.Context, id string) (*models.User, error)
	FindByRoles(ctx context.Context, roles []models.Role) ([]models.User, error)
	FindAll(ctx context.Context) ([]models.User, error)
	Update(ctx context.Context, id string, update models.AdminUpdateUserRequest) (*models.User, error)
	UpdatePassword(ctx context.Context, id, passwordHash string) error
	Delete(ctx context.Context, id string) error
	UpsertByEmail(ctx context.Context, email string, user *models.User) (*models.User, error)
}

type userRepository struct {
	col *mongo.Collection
}

func NewUserRepository(db *mongo.Database) UserRepository {
	col := db.Collection("users")

	// Enforce uniqueness at the DB layer — the service-level FindByEmail check
	// in Register/CreateAdminUser/UpsertOAuthUser is a UX nicety; this index is
	// the actual safety net against concurrent registrations and any code path
	// that bypasses the service. Non-fatal: if duplicate emails already exist
	// from before this migration, the create call will fail and we log a
	// warning. Once duplicates are cleaned up, the next server boot succeeds.
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if _, err := col.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys:    bson.D{{Key: "email", Value: 1}},
		Options: options.Index().SetUnique(true).SetName("uniq_email"),
	}); err != nil {
		slog.Warn("users: could not create unique index on email — clean up duplicates with db.users.aggregate([...]) and retry", "err", err)
	}

	return &userRepository{col: col}
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

func (r *userRepository) FindAll(ctx context.Context) ([]models.User, error) {
	cursor, err := r.col.Find(ctx, bson.M{}, options.Find().SetSort(bson.D{{Key: "created_at", Value: -1}}))
	if err != nil {
		return nil, err
	}
	users := make([]models.User, 0)
	return users, cursor.All(ctx, &users)
}

func (r *userRepository) Update(ctx context.Context, id string, req models.AdminUpdateUserRequest) (*models.User, error) {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, err
	}

	set := bson.M{"updated_at": time.Now()}
	if req.FirstName != "" {
		set["first_name"] = req.FirstName
	}
	if req.LastName != "" {
		set["last_name"] = req.LastName
	}
	if req.Role != "" {
		set["role"] = string(req.Role)
	}
	if req.BranchSlugs != nil {
		set["branch_slugs"] = req.BranchSlugs
	}

	after := options.After
	opt := options.FindOneAndUpdateOptions{ReturnDocument: &after}
	var updated models.User
	err = r.col.FindOneAndUpdate(ctx, bson.M{"_id": oid}, bson.M{"$set": set}, &opt).Decode(&updated)
	if err != nil {
		return nil, err
	}
	return &updated, nil
}

func (r *userRepository) UpdatePassword(ctx context.Context, id, passwordHash string) error {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return err
	}
	_, err = r.col.UpdateOne(ctx, bson.M{"_id": oid},
		bson.M{"$set": bson.M{"password_hash": passwordHash, "updated_at": time.Now()}})
	return err
}

func (r *userRepository) Delete(ctx context.Context, id string) error {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return err
	}
	_, err = r.col.DeleteOne(ctx, bson.M{"_id": oid})
	return err
}

func (r *userRepository) UpsertByEmail(ctx context.Context, email string, user *models.User) (*models.User, error) {
	after := options.After
	opt := options.FindOneAndUpdateOptions{
		ReturnDocument: &after,
		Upsert:         boolPtr(true),
	}
	update := bson.M{
		"$set": bson.M{
			"email":          user.Email,
			"first_name":     user.FirstName,
			"last_name":      user.LastName,
			"role":           string(user.Role),
			"oauth_provider": user.OAuthProvider,
			"oauth_id":       user.OAuthID,
			"updated_at":     time.Now(),
		},
		"$setOnInsert": bson.M{
			"_id":           user.ID,
			"password_hash": user.PasswordHash,
			"created_at":    time.Now(),
		},
	}

	var result models.User
	err := r.col.FindOneAndUpdate(ctx, bson.M{"email": email}, update, &opt).Decode(&result)
	if err != nil {
		return nil, err
	}
	return &result, nil
}

func boolPtr(b bool) *bool { return &b }
