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

type EnquiryRepository interface {
	Create(ctx context.Context, e *models.Enquiry) error
	FindAll(ctx context.Context) ([]models.Enquiry, error)
	Find(ctx context.Context, f models.EnquiryFilter) ([]models.Enquiry, error)
	FindByID(ctx context.Context, id string) (*models.Enquiry, error)
	// ChangeStatus sets the status and appends an activity entry. When the new
	// status is "registered" it also flips registration.is_registered to true.
	ChangeStatus(ctx context.Context, id, status string, act models.EnquiryActivity) error
	AddNote(ctx context.Context, id string, note models.EnquiryNote, act models.EnquiryActivity) error
	UpdateFollowUp(ctx context.Context, id string, f models.EnquiryFollowUpRequest, act models.EnquiryActivity) error
	Assign(ctx context.Context, id, assignedTo, assignedToName string, act models.EnquiryActivity) error
	// Register persists the registration sub-document, sets status to
	// "registered", and appends an activity entry.
	Register(ctx context.Context, id string, reg models.EnquiryRegistration, act models.EnquiryActivity) error
	LogActivity(ctx context.Context, id string, act models.EnquiryActivity) error
}

type enquiryRepository struct {
	col *mongo.Collection
}

func NewEnquiryRepository(db *mongo.Database) EnquiryRepository {
	col := db.Collection("enquiries")

	// Indexes backing the admissions-CRM list filters and the default
	// created_at sort. Best-effort: failures are logged, never fatal (matches
	// the users repo pattern) so a transient index error can't block startup.
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if _, err := col.Indexes().CreateMany(ctx, []mongo.IndexModel{
		{Keys: bson.D{{Key: "created_at", Value: -1}}, Options: options.Index().SetName("created_at_desc")},
		{Keys: bson.D{{Key: "status", Value: 1}}, Options: options.Index().SetName("status")},
		{Keys: bson.D{{Key: "branch", Value: 1}}, Options: options.Index().SetName("branch")},
		{Keys: bson.D{{Key: "assigned_to", Value: 1}}, Options: options.Index().SetName("assigned_to")},
		{Keys: bson.D{{Key: "follow_up_date", Value: 1}}, Options: options.Index().SetName("follow_up_date")},
	}); err != nil {
		slog.Warn("enquiries: could not create indexes", "err", err)
	}

	return &enquiryRepository{col: col}
}

func (r *enquiryRepository) Create(ctx context.Context, e *models.Enquiry) error {
	e.ID = primitive.NewObjectID()
	now := time.Now()
	e.CreatedAt = now
	e.UpdatedAt = now
	_, err := r.col.InsertOne(ctx, e)
	return err
}

func (r *enquiryRepository) FindAll(ctx context.Context) ([]models.Enquiry, error) {
	return r.Find(ctx, models.EnquiryFilter{})
}

func (r *enquiryRepository) Find(ctx context.Context, f models.EnquiryFilter) ([]models.Enquiry, error) {
	filter := bson.M{}
	if f.Branch != "" {
		filter["branch"] = f.Branch
	}
	if f.Type != "" {
		filter["enquiry_type"] = f.Type
	}
	if f.Status != "" {
		filter["status"] = f.Status
	}
	if f.AssignedTo != "" {
		filter["assigned_to"] = f.AssignedTo
	}
	if f.From != nil || f.To != nil {
		rng := bson.M{}
		if f.From != nil {
			rng["$gte"] = *f.From
		}
		if f.To != nil {
			rng["$lte"] = *f.To
		}
		filter["created_at"] = rng
	}

	sortBy := f.SortBy
	if sortBy == "" {
		sortBy = "created_at"
	}
	sortDir := f.SortDir
	if sortDir == 0 {
		sortDir = -1
	}
	opts := options.Find().SetSort(bson.D{{Key: sortBy, Value: sortDir}})
	if f.Limit > 0 {
		opts.SetLimit(f.Limit)
	}
	if f.Skip > 0 {
		opts.SetSkip(f.Skip)
	}

	cursor, err := r.col.Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	results := make([]models.Enquiry, 0)
	return results, cursor.All(ctx, &results)
}

func (r *enquiryRepository) FindByID(ctx context.Context, id string) (*models.Enquiry, error) {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, err
	}
	var e models.Enquiry
	if err = r.col.FindOne(ctx, bson.M{"_id": oid}).Decode(&e); err != nil {
		return nil, err
	}
	return &e, nil
}

// apply runs a single update that $sets fields (always bumping updated_at) and
// optionally $pushes an activity entry and/or a note. Keeps every mutation
// atomic and consistently timestamped.
func (r *enquiryRepository) apply(ctx context.Context, id string, set bson.M, act *models.EnquiryActivity, note *models.EnquiryNote) error {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return err
	}
	if set == nil {
		set = bson.M{}
	}
	set["updated_at"] = time.Now()
	update := bson.M{"$set": set}

	push := bson.M{}
	if act != nil {
		push["activity_log"] = act
	}
	if note != nil {
		push["notes"] = note
	}
	if len(push) > 0 {
		update["$push"] = push
	}

	_, err = r.col.UpdateOne(ctx, bson.M{"_id": oid}, update)
	return err
}

func (r *enquiryRepository) ChangeStatus(ctx context.Context, id, status string, act models.EnquiryActivity) error {
	set := bson.M{"status": status}
	switch status {
	case models.EnquiryStatusRegistered:
		set["registration.is_registered"] = true
		set["registration.registration_date"] = time.Now()
	case models.EnquiryStatusCancelled, models.EnquiryStatusLost:
		// Moving to a terminal lost/cancelled state clears the registered flag.
		set["registration.is_registered"] = false
	}
	return r.apply(ctx, id, set, &act, nil)
}

func (r *enquiryRepository) AddNote(ctx context.Context, id string, note models.EnquiryNote, act models.EnquiryActivity) error {
	return r.apply(ctx, id, nil, &act, &note)
}

func (r *enquiryRepository) UpdateFollowUp(ctx context.Context, id string, f models.EnquiryFollowUpRequest, act models.EnquiryActivity) error {
	set := bson.M{
		"assigned_to":      f.AssignedTo,
		"assigned_to_name": f.AssignedToName,
		"priority":         f.Priority,
		"follow_up_date":   f.FollowUpDate,
		"next_action":      f.NextAction,
	}
	return r.apply(ctx, id, set, &act, nil)
}

func (r *enquiryRepository) Assign(ctx context.Context, id, assignedTo, assignedToName string, act models.EnquiryActivity) error {
	set := bson.M{
		"assigned_to":      assignedTo,
		"assigned_to_name": assignedToName,
	}
	return r.apply(ctx, id, set, &act, nil)
}

func (r *enquiryRepository) Register(ctx context.Context, id string, reg models.EnquiryRegistration, act models.EnquiryActivity) error {
	set := bson.M{
		"registration": reg,
		"status":       models.EnquiryStatusRegistered,
	}
	return r.apply(ctx, id, set, &act, nil)
}

func (r *enquiryRepository) LogActivity(ctx context.Context, id string, act models.EnquiryActivity) error {
	return r.apply(ctx, id, nil, &act, nil)
}
