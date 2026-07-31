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

// ── Staff room assignments ────────────────────────────────────────────────────

type StaffRoomAssignmentFilter struct {
	StaffID string
	RoomID  string
	Branch  string
	Status  models.AssignmentStatus // empty = all
}

type StaffRoomAssignmentRepository interface {
	Create(ctx context.Context, a *models.StaffRoomAssignment) error
	FindAll(ctx context.Context, f StaffRoomAssignmentFilter) ([]models.StaffRoomAssignment, error)
	FindByID(ctx context.Context, id string) (*models.StaffRoomAssignment, error)
	Update(ctx context.Context, a *models.StaffRoomAssignment) error
	// Delete exists ONLY for compensating rollbacks and test cleanup — normal
	// flows end assignments, never delete them.
	Delete(ctx context.Context, id string) error
}

type staffRoomAssignmentRepository struct {
	col *TenantCollection
}

func NewStaffRoomAssignmentRepository(db *mongo.Database) StaffRoomAssignmentRepository {
	col := db.Collection("staff_room_assignments")
	// Concurrency backstop: the same staff member can never hold two ACTIVE
	// assignments to the same room, even under racing requests. Multiple
	// active assignments to different rooms remain allowed (multi-room work).
	_, _ = col.Indexes().CreateOne(context.Background(), mongo.IndexModel{
		Keys: bson.D{{Key: "staff_id", Value: 1}, {Key: "room_id", Value: 1}},
		Options: options.Index().SetUnique(true).
			SetPartialFilterExpression(bson.M{"status": string(models.AssignmentActive)}),
	})
	return &staffRoomAssignmentRepository{col: NewTenantCollectionFrom(col)}
}

func (r *staffRoomAssignmentRepository) Create(ctx context.Context, a *models.StaffRoomAssignment) error {
	a.ID = primitive.NewObjectID()
	now := time.Now()
	a.CreatedAt = now
	a.UpdatedAt = now
	_, err := r.col.InsertOne(ctx, a)
	return err
}

func (r *staffRoomAssignmentRepository) FindAll(ctx context.Context, f StaffRoomAssignmentFilter) ([]models.StaffRoomAssignment, error) {
	filter := bson.M{}
	if f.StaffID != "" {
		filter["staff_id"] = f.StaffID
	}
	if f.RoomID != "" {
		filter["room_id"] = f.RoomID
	}
	if f.Branch != "" {
		filter["branch_slug"] = f.Branch
	}
	if f.Status != "" {
		filter["status"] = f.Status
	}
	opts := options.Find().SetSort(bson.D{{Key: "status", Value: 1}, {Key: "start_date", Value: -1}})
	cursor, err := r.col.Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	out := make([]models.StaffRoomAssignment, 0)
	return out, cursor.All(ctx, &out)
}

func (r *staffRoomAssignmentRepository) FindByID(ctx context.Context, id string) (*models.StaffRoomAssignment, error) {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, err
	}
	var a models.StaffRoomAssignment
	if err = r.col.FindOne(ctx, bson.M{"_id": oid}).Decode(&a); err != nil {
		return nil, err
	}
	return &a, nil
}

func (r *staffRoomAssignmentRepository) Update(ctx context.Context, a *models.StaffRoomAssignment) error {
	a.UpdatedAt = time.Now()
	update := bson.M{"$set": bson.M{
		"role_in_room": a.RoleInRoom,
		"is_primary":   a.IsPrimary,
		"start_date":   a.StartDate,
		"end_date":     a.EndDate,
		"status":       a.Status,
		"updated_by":   a.UpdatedBy,
		"updated_at":   a.UpdatedAt,
	}}
	_, err := r.col.UpdateOne(ctx, bson.M{"_id": a.ID}, update)
	return err
}

func (r *staffRoomAssignmentRepository) Delete(ctx context.Context, id string) error {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return err
	}
	_, err = r.col.DeleteOne(ctx, bson.M{"_id": oid})
	return err
}

// ── Child room assignments ────────────────────────────────────────────────────

type ChildRoomAssignmentFilter struct {
	ChildID string
	RoomID  string
	Branch  string
	Status  models.AssignmentStatus
}

type ChildRoomAssignmentRepository interface {
	Create(ctx context.Context, a *models.ChildRoomAssignment) error
	FindAll(ctx context.Context, f ChildRoomAssignmentFilter) ([]models.ChildRoomAssignment, error)
	FindByID(ctx context.Context, id string) (*models.ChildRoomAssignment, error)
	Update(ctx context.Context, a *models.ChildRoomAssignment) error
	// Delete exists ONLY for compensating rollbacks and test cleanup.
	Delete(ctx context.Context, id string) error
}

type childRoomAssignmentRepository struct {
	col *TenantCollection
}

func NewChildRoomAssignmentRepository(db *mongo.Database) ChildRoomAssignmentRepository {
	col := db.Collection("child_room_assignments")
	// The hard invariants (CHILDROOM-TC-018): at most one ACTIVE placement and
	// at most one SCHEDULED placement per child — racing transfers cannot both
	// win; the loser gets a duplicate-key error.
	_, _ = col.Indexes().CreateOne(context.Background(), mongo.IndexModel{
		Keys: bson.D{{Key: "child_id", Value: 1}},
		Options: options.Index().SetUnique(true).SetName("one_active_room_per_child").
			SetPartialFilterExpression(bson.M{"status": string(models.AssignmentActive)}),
	})
	_, _ = col.Indexes().CreateOne(context.Background(), mongo.IndexModel{
		Keys: bson.D{{Key: "child_id", Value: 1}, {Key: "status", Value: 1}},
		Options: options.Index().SetUnique(true).SetName("one_scheduled_room_per_child").
			SetPartialFilterExpression(bson.M{"status": string(models.AssignmentScheduled)}),
	})
	return &childRoomAssignmentRepository{col: NewTenantCollectionFrom(col)}
}

func (r *childRoomAssignmentRepository) Create(ctx context.Context, a *models.ChildRoomAssignment) error {
	a.ID = primitive.NewObjectID()
	now := time.Now()
	a.CreatedAt = now
	a.UpdatedAt = now
	_, err := r.col.InsertOne(ctx, a)
	return err
}

func (r *childRoomAssignmentRepository) FindAll(ctx context.Context, f ChildRoomAssignmentFilter) ([]models.ChildRoomAssignment, error) {
	filter := bson.M{}
	if f.ChildID != "" {
		filter["child_id"] = f.ChildID
	}
	if f.RoomID != "" {
		filter["room_id"] = f.RoomID
	}
	if f.Branch != "" {
		filter["branch_slug"] = f.Branch
	}
	if f.Status != "" {
		filter["status"] = f.Status
	}
	opts := options.Find().SetSort(bson.D{{Key: "status", Value: 1}, {Key: "start_date", Value: -1}})
	cursor, err := r.col.Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	out := make([]models.ChildRoomAssignment, 0)
	return out, cursor.All(ctx, &out)
}

func (r *childRoomAssignmentRepository) FindByID(ctx context.Context, id string) (*models.ChildRoomAssignment, error) {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, err
	}
	var a models.ChildRoomAssignment
	if err = r.col.FindOne(ctx, bson.M{"_id": oid}).Decode(&a); err != nil {
		return nil, err
	}
	return &a, nil
}

func (r *childRoomAssignmentRepository) Update(ctx context.Context, a *models.ChildRoomAssignment) error {
	a.UpdatedAt = time.Now()
	update := bson.M{"$set": bson.M{
		"start_date":      a.StartDate,
		"end_date":        a.EndDate,
		"status":          a.Status,
		"transfer_reason": a.TransferReason,
		"notes":           a.Notes,
		"override_reason": a.OverrideReason,
		"updated_by":      a.UpdatedBy,
		"updated_at":      a.UpdatedAt,
	}}
	_, err := r.col.UpdateOne(ctx, bson.M{"_id": a.ID}, update)
	return err
}

func (r *childRoomAssignmentRepository) Delete(ctx context.Context, id string) error {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return err
	}
	_, err = r.col.DeleteOne(ctx, bson.M{"_id": oid})
	return err
}
