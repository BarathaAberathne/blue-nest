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

// FinanceRepository stores families, charges, payments and schedules (all
// tenant-scoped), plus the processed-webhook-event guard that makes duplicate
// Stripe deliveries harmless.
type FinanceRepository interface {
	// Families.
	FamilyByID(ctx context.Context, id string) (*models.Family, error)
	FamilyByChild(ctx context.Context, childID string) (*models.Family, error)
	FamilyByParent(ctx context.Context, parentID string) (*models.Family, error)
	FamilyByCustomer(ctx context.Context, stripeCustomerID string) (*models.Family, error)
	FamiliesAll(ctx context.Context) ([]models.Family, error)
	FamilyCreate(ctx context.Context, f *models.Family) error
	FamilyUpdate(ctx context.Context, id string, f models.Family) (*models.Family, error)

	// Charges.
	ChargeByID(ctx context.Context, id string) (*models.Charge, error)
	ChargeByPaymentIntent(ctx context.Context, piID string) (*models.Charge, error)
	ChargesByFamily(ctx context.Context, familyID string) ([]models.Charge, error)
	ChargesAll(ctx context.Context) ([]models.Charge, error)
	ChargeCreate(ctx context.Context, c *models.Charge) error
	ChargeUpdate(ctx context.Context, id string, c models.Charge) (*models.Charge, error)

	// Payments.
	PaymentsByFamily(ctx context.Context, familyID string) ([]models.Payment, error)
	PaymentByIntent(ctx context.Context, piID string) (*models.Payment, error)
	PaymentCreate(ctx context.Context, p *models.Payment) error
	PaymentUpdate(ctx context.Context, id string, p models.Payment) (*models.Payment, error)

	// Schedules.
	SchedulesByFamily(ctx context.Context, familyID string) ([]models.PaymentSchedule, error)
	SchedulesActive(ctx context.Context) ([]models.PaymentSchedule, error)
	ScheduleCreate(ctx context.Context, s *models.PaymentSchedule) error
	ScheduleUpdate(ctx context.Context, id string, s models.PaymentSchedule) (*models.PaymentSchedule, error)

	// MarkEventProcessed inserts the Stripe event id; returns false when the
	// event was already handled (duplicate delivery) — the idempotency guard.
	MarkEventProcessed(ctx context.Context, eventID string) (bool, error)
}

type financeRepository struct {
	families  *TenantCollection
	charges   *TenantCollection
	payments  *TenantCollection
	schedules *TenantCollection
	events    *mongo.Collection // global (event ids are globally unique)
}

func NewFinanceRepository(db *mongo.Database) FinanceRepository {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	events := db.Collection("webhook_events")
	if _, err := events.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys:    bson.D{{Key: "event_id", Value: 1}},
		Options: options.Index().SetUnique(true).SetName("uniq_webhook_event"),
	}); err != nil {
		slog.Warn("webhook_events: could not create unique index", "err", err)
	}
	fam := db.Collection("families")
	if _, err := fam.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys:    bson.D{{Key: "org_id", Value: 1}, {Key: "child_ids", Value: 1}},
		Options: options.Index().SetName("idx_family_children"),
	}); err != nil {
		slog.Warn("families: could not create index", "err", err)
	}
	return &financeRepository{
		families:  NewTenantCollectionFrom(fam),
		charges:   NewTenantCollectionFrom(db.Collection("charges")),
		payments:  NewTenantCollectionFrom(db.Collection("payments")),
		schedules: NewTenantCollectionFrom(db.Collection("payment_schedules")),
		events:    events,
	}
}

// fullSet marshals a struct into a $set map minus immutable keys, unsetting
// listed clearable fields that omitempty dropped (the parent-token lesson).
func fullSet(v any, clearable ...string) (bson.M, error) {
	doc, err := bson.Marshal(v)
	if err != nil {
		return nil, err
	}
	var set bson.M
	if err := bson.Unmarshal(doc, &set); err != nil {
		return nil, err
	}
	delete(set, "_id")
	delete(set, "org_id")
	delete(set, "ref")
	delete(set, "created_at")
	update := bson.M{"$set": set}
	unset := bson.M{}
	for _, f := range clearable {
		if _, ok := set[f]; !ok {
			unset[f] = ""
		}
	}
	if len(unset) > 0 {
		update["$unset"] = unset
	}
	return update, nil
}

func oid(id string) (primitive.ObjectID, error) { return primitive.ObjectIDFromHex(id) }

// ── Families ─────────────────────────────────────────────────────────────────

func (r *financeRepository) FamilyByID(ctx context.Context, id string) (*models.Family, error) {
	o, err := oid(id)
	if err != nil {
		return nil, err
	}
	var f models.Family
	if err := r.families.FindOne(ctx, bson.M{"_id": o}).Decode(&f); err != nil {
		return nil, err
	}
	return &f, nil
}

func (r *financeRepository) FamilyByChild(ctx context.Context, childID string) (*models.Family, error) {
	var f models.Family
	if err := r.families.FindOne(ctx, bson.M{"child_ids": childID}).Decode(&f); err != nil {
		return nil, err
	}
	return &f, nil
}

func (r *financeRepository) FamilyByParent(ctx context.Context, parentID string) (*models.Family, error) {
	var f models.Family
	if err := r.families.FindOne(ctx, bson.M{"parent_ids": parentID}).Decode(&f); err != nil {
		return nil, err
	}
	return &f, nil
}

func (r *financeRepository) FamilyByCustomer(ctx context.Context, cusID string) (*models.Family, error) {
	var f models.Family
	if err := r.families.FindOne(ctx, bson.M{"stripe_customer_id": cusID}).Decode(&f); err != nil {
		return nil, err
	}
	return &f, nil
}

func (r *financeRepository) FamiliesAll(ctx context.Context) ([]models.Family, error) {
	cur, err := r.families.Find(ctx, bson.M{}, options.Find().SetSort(bson.D{{Key: "name", Value: 1}}))
	if err != nil {
		return nil, err
	}
	out := make([]models.Family, 0)
	return out, cur.All(ctx, &out)
}

func (r *financeRepository) FamilyCreate(ctx context.Context, f *models.Family) error {
	now := time.Now()
	f.CreatedAt, f.UpdatedAt = now, now
	res, err := r.families.InsertOne(ctx, f)
	if err != nil {
		return err
	}
	if o, ok := res.InsertedID.(primitive.ObjectID); ok {
		f.ID = o
	}
	return nil
}

func (r *financeRepository) FamilyUpdate(ctx context.Context, id string, f models.Family) (*models.Family, error) {
	o, err := oid(id)
	if err != nil {
		return nil, err
	}
	f.UpdatedAt = time.Now()
	update, err := fullSet(f, "stripe_payment_method_id", "stripe_mandate_id", "dd_setup_session_id")
	if err != nil {
		return nil, err
	}
	var out models.Family
	if err := r.families.FindOneAndUpdate(ctx, bson.M{"_id": o}, update, options.FindOneAndUpdate().SetReturnDocument(options.After)).Decode(&out); err != nil {
		return nil, err
	}
	return &out, nil
}

// ── Charges ──────────────────────────────────────────────────────────────────

func (r *financeRepository) ChargeByID(ctx context.Context, id string) (*models.Charge, error) {
	o, err := oid(id)
	if err != nil {
		return nil, err
	}
	var c models.Charge
	if err := r.charges.FindOne(ctx, bson.M{"_id": o}).Decode(&c); err != nil {
		return nil, err
	}
	return &c, nil
}

func (r *financeRepository) ChargeByPaymentIntent(ctx context.Context, piID string) (*models.Charge, error) {
	var c models.Charge
	if err := r.charges.FindOne(ctx, bson.M{"stripe_payment_intent_id": piID}).Decode(&c); err != nil {
		return nil, err
	}
	return &c, nil
}

func (r *financeRepository) ChargesByFamily(ctx context.Context, familyID string) ([]models.Charge, error) {
	cur, err := r.charges.Find(ctx, bson.M{"family_id": familyID}, options.Find().SetSort(bson.D{{Key: "due_date", Value: 1}}))
	if err != nil {
		return nil, err
	}
	out := make([]models.Charge, 0)
	return out, cur.All(ctx, &out)
}

func (r *financeRepository) ChargesAll(ctx context.Context) ([]models.Charge, error) {
	cur, err := r.charges.Find(ctx, bson.M{}, options.Find().SetSort(bson.D{{Key: "due_date", Value: 1}}))
	if err != nil {
		return nil, err
	}
	out := make([]models.Charge, 0)
	return out, cur.All(ctx, &out)
}

func (r *financeRepository) ChargeCreate(ctx context.Context, c *models.Charge) error {
	now := time.Now()
	c.CreatedAt, c.UpdatedAt = now, now
	res, err := r.charges.InsertOne(ctx, c)
	if err != nil {
		return err
	}
	if o, ok := res.InsertedID.(primitive.ObjectID); ok {
		c.ID = o
	}
	return nil
}

func (r *financeRepository) ChargeUpdate(ctx context.Context, id string, c models.Charge) (*models.Charge, error) {
	o, err := oid(id)
	if err != nil {
		return nil, err
	}
	c.UpdatedAt = time.Now()
	update, err := fullSet(c, "paid_at", "stripe_payment_intent_id")
	if err != nil {
		return nil, err
	}
	var out models.Charge
	if err := r.charges.FindOneAndUpdate(ctx, bson.M{"_id": o}, update, options.FindOneAndUpdate().SetReturnDocument(options.After)).Decode(&out); err != nil {
		return nil, err
	}
	return &out, nil
}

// ── Payments ─────────────────────────────────────────────────────────────────

func (r *financeRepository) PaymentsByFamily(ctx context.Context, familyID string) ([]models.Payment, error) {
	cur, err := r.payments.Find(ctx, bson.M{"family_id": familyID}, options.Find().SetSort(bson.D{{Key: "created_at", Value: -1}}))
	if err != nil {
		return nil, err
	}
	out := make([]models.Payment, 0)
	return out, cur.All(ctx, &out)
}

func (r *financeRepository) PaymentByIntent(ctx context.Context, piID string) (*models.Payment, error) {
	var p models.Payment
	if err := r.payments.FindOne(ctx, bson.M{"stripe_payment_intent_id": piID}).Decode(&p); err != nil {
		return nil, err
	}
	return &p, nil
}

func (r *financeRepository) PaymentCreate(ctx context.Context, p *models.Payment) error {
	now := time.Now()
	p.CreatedAt, p.UpdatedAt = now, now
	res, err := r.payments.InsertOne(ctx, p)
	if err != nil {
		return err
	}
	if o, ok := res.InsertedID.(primitive.ObjectID); ok {
		p.ID = o
	}
	return nil
}

func (r *financeRepository) PaymentUpdate(ctx context.Context, id string, p models.Payment) (*models.Payment, error) {
	o, err := oid(id)
	if err != nil {
		return nil, err
	}
	p.UpdatedAt = time.Now()
	update, err := fullSet(p)
	if err != nil {
		return nil, err
	}
	var out models.Payment
	if err := r.payments.FindOneAndUpdate(ctx, bson.M{"_id": o}, update, options.FindOneAndUpdate().SetReturnDocument(options.After)).Decode(&out); err != nil {
		return nil, err
	}
	return &out, nil
}

// ── Schedules ────────────────────────────────────────────────────────────────

func (r *financeRepository) SchedulesByFamily(ctx context.Context, familyID string) ([]models.PaymentSchedule, error) {
	cur, err := r.schedules.Find(ctx, bson.M{"family_id": familyID})
	if err != nil {
		return nil, err
	}
	out := make([]models.PaymentSchedule, 0)
	return out, cur.All(ctx, &out)
}

func (r *financeRepository) SchedulesActive(ctx context.Context) ([]models.PaymentSchedule, error) {
	cur, err := r.schedules.Find(ctx, bson.M{"active": true})
	if err != nil {
		return nil, err
	}
	out := make([]models.PaymentSchedule, 0)
	return out, cur.All(ctx, &out)
}

func (r *financeRepository) ScheduleCreate(ctx context.Context, s *models.PaymentSchedule) error {
	now := time.Now()
	s.CreatedAt, s.UpdatedAt = now, now
	res, err := r.schedules.InsertOne(ctx, s)
	if err != nil {
		return err
	}
	if o, ok := res.InsertedID.(primitive.ObjectID); ok {
		s.ID = o
	}
	return nil
}

func (r *financeRepository) ScheduleUpdate(ctx context.Context, id string, s models.PaymentSchedule) (*models.PaymentSchedule, error) {
	o, err := oid(id)
	if err != nil {
		return nil, err
	}
	s.UpdatedAt = time.Now()
	update, err := fullSet(s, "end_month", "last_generated")
	if err != nil {
		return nil, err
	}
	var out models.PaymentSchedule
	if err := r.schedules.FindOneAndUpdate(ctx, bson.M{"_id": o}, update, options.FindOneAndUpdate().SetReturnDocument(options.After)).Decode(&out); err != nil {
		return nil, err
	}
	return &out, nil
}

// ── Webhook idempotency ──────────────────────────────────────────────────────

func (r *financeRepository) MarkEventProcessed(ctx context.Context, eventID string) (bool, error) {
	_, err := r.events.InsertOne(ctx, bson.M{"event_id": eventID, "processed_at": time.Now()})
	if err != nil {
		if mongo.IsDuplicateKeyError(err) {
			return false, nil
		}
		return false, err
	}
	return true, nil
}
