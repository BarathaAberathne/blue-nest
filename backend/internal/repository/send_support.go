package repository

import (
	"context"
	"log/slog"
	"time"

	"github.com/blue-nest-montessori/api/internal/models"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// SendSupportRepository stores the sensitive SEND/additional-support profiles
// (collection child_send_support, tenant-scoped, one doc per child). Absent
// doc = no additional-support information recorded.
type SendSupportRepository interface {
	FindByChild(ctx context.Context, childID string) (*models.ChildSendSupport, error)
	// FindByChildren batch-fetches profiles for the overview (no N+1).
	FindByChildren(ctx context.Context, childIDs []string) ([]models.ChildSendSupport, error)
	Upsert(ctx context.Context, p *models.ChildSendSupport) (*models.ChildSendSupport, error)
	DeleteByChild(ctx context.Context, childID string) error
}

type sendSupportRepository struct {
	col *TenantCollection
}

func NewSendSupportRepository(db *mongo.Database) SendSupportRepository {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	col := db.Collection("child_send_support")
	if _, err := col.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys:    bson.D{{Key: "org_id", Value: 1}, {Key: "child_id", Value: 1}},
		Options: options.Index().SetUnique(true).SetName("uniq_send_support_child"),
	}); err != nil {
		slog.Warn("child_send_support: could not create unique index", "err", err)
	}
	return &sendSupportRepository{col: NewTenantCollectionFrom(col)}
}

func (r *sendSupportRepository) FindByChild(ctx context.Context, childID string) (*models.ChildSendSupport, error) {
	var p models.ChildSendSupport
	if err := r.col.FindOne(ctx, bson.M{"child_id": childID}).Decode(&p); err != nil {
		return nil, err
	}
	return &p, nil
}

func (r *sendSupportRepository) FindByChildren(ctx context.Context, childIDs []string) ([]models.ChildSendSupport, error) {
	if len(childIDs) == 0 {
		return []models.ChildSendSupport{}, nil
	}
	cur, err := r.col.Find(ctx, bson.M{"child_id": bson.M{"$in": childIDs}})
	if err != nil {
		return nil, err
	}
	out := make([]models.ChildSendSupport, 0)
	return out, cur.All(ctx, &out)
}

// Upsert replaces the child's whole profile. Clearable optional fields are
// explicitly $unset when empty (the omitempty-$set lesson).
func (r *sendSupportRepository) Upsert(ctx context.Context, p *models.ChildSendSupport) (*models.ChildSendSupport, error) {
	now := time.Now()
	p.UpdatedAt = now
	set := bson.M{
		"status":     p.Status,
		"updated_at": p.UpdatedAt,
	}
	unset := bson.M{}
	strField := func(key, v string) {
		if v == "" {
			unset[key] = ""
		} else {
			set[key] = v
		}
	}
	strField("summary", p.Summary)
	strField("send_lead_staff_id", p.SendLeadStaffID)
	strField("review_date", p.ReviewDate)
	strField("start_date", p.StartDate)
	strField("end_date", p.EndDate)
	if p.PlanStatus == "" {
		unset["plan_status"] = ""
	} else {
		set["plan_status"] = p.PlanStatus
	}
	if len(p.Categories) == 0 {
		unset["categories"] = ""
	} else {
		set["categories"] = p.Categories
	}
	update := bson.M{
		"$set":         set,
		"$setOnInsert": bson.M{"child_id": p.ChildID, "created_at": now},
	}
	if len(unset) > 0 {
		update["$unset"] = unset
	}
	opts := options.FindOneAndUpdate().SetUpsert(true).SetReturnDocument(options.After)
	var out models.ChildSendSupport
	if err := r.col.FindOneAndUpdate(ctx, bson.M{"child_id": p.ChildID}, update, opts).Decode(&out); err != nil {
		return nil, err
	}
	return &out, nil
}

func (r *sendSupportRepository) DeleteByChild(ctx context.Context, childID string) error {
	_, err := r.col.DeleteOne(ctx, bson.M{"child_id": childID})
	return err
}
