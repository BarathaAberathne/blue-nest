package repository

import (
	"context"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// ── Multi-tenancy: central org-scope enforcement ─────────────────────────────
//
// The platform is multi-tenant on a shared database. Every tenant-scoped
// collection carries `org_id`, and isolation is enforced HERE — in one place —
// rather than by per-query discipline. A repository that wraps its collection in
// a TenantCollection automatically:
//   - filters every read/update/delete by the caller's org (from context), so
//     one organisation can never see or touch another's data;
//   - stamps `org_id` onto every inserted document.
//
// The org travels in the request context (set by middleware from the JWT / host).
// System paths with no org (migrations, seeds, webhooks, the pre-auth user
// lookup at login) run "cross-org" and bypass the filter — they must use raw
// access responsibly.

type tenantContextKey string

const orgContextKey tenantContextKey = "orgID"

// crossOrgMarker in context means "no tenant filter" (platform operator /
// system / pre-auth paths).
const crossOrgMarker = "\x00cross-org\x00"

// WithOrg pins the request to a single organisation. Every tenant collection
// then filters + stamps by this org.
func WithOrg(ctx context.Context, orgID string) context.Context {
	return context.WithValue(ctx, orgContextKey, orgID)
}

// WithCrossOrg marks the context as platform/system scope — no org filtering.
func WithCrossOrg(ctx context.Context) context.Context {
	return context.WithValue(ctx, orgContextKey, crossOrgMarker)
}

// IsCrossOrg reports whether ctx carries the EXPLICIT cross-org marker set by
// WithCrossOrg (i.e. the caller is the platform operator). Unlike
// OrgFromContext — where an absent/empty org also reads as "no tenant filter"
// — this is fail-closed: a bare context is NOT cross-org. Use it for
// privilege checks (e.g. only a platform operator may assign
// platform_super_admin), never for query scoping.
func IsCrossOrg(ctx context.Context) bool {
	v, _ := ctx.Value(orgContextKey).(string)
	return v == crossOrgMarker
}

// OrgFromContext returns (orgID, crossOrg). crossOrg true (or an empty orgID)
// means no tenant filter is applied.
func OrgFromContext(ctx context.Context) (string, bool) {
	v, _ := ctx.Value(orgContextKey).(string)
	if v == crossOrgMarker || v == "" {
		return "", true
	}
	return v, false
}

// TenantCollection wraps a *mongo.Collection and injects org scope on every
// operation. Its method set is a superset of what the repositories use, with
// signatures identical to mongo.Collection so repo bodies compile unchanged.
type TenantCollection struct {
	col *mongo.Collection
}

// NewTenantCollection returns an org-scoped handle to a collection.
func NewTenantCollection(db *mongo.Database, name string) *TenantCollection {
	return &TenantCollection{col: db.Collection(name)}
}

// NewTenantCollectionFrom wraps an existing raw collection (used where the repo
// needs the raw handle first, e.g. to create indexes at startup).
func NewTenantCollectionFrom(col *mongo.Collection) *TenantCollection {
	return &TenantCollection{col: col}
}

// Raw exposes the underlying collection for the rare cross-tenant/system query
// that must opt out of scoping deliberately.
func (c *TenantCollection) Raw() *mongo.Collection { return c.col }

// scopeFilter merges the caller's org into a query filter (unless cross-org).
func scopeFilter(ctx context.Context, filter interface{}) interface{} {
	org, cross := OrgFromContext(ctx)
	if cross {
		return filter
	}
	switch f := filter.(type) {
	case bson.M:
		nf := make(bson.M, len(f)+1)
		for k, v := range f {
			nf[k] = v
		}
		nf["org_id"] = org
		return nf
	case bson.D:
		return append(bson.D{{Key: "org_id", Value: org}}, f...)
	case nil:
		return bson.M{"org_id": org}
	default:
		return bson.M{"$and": bson.A{filter, bson.M{"org_id": org}}}
	}
}

// stampOrg sets org_id on a document about to be inserted (unless cross-org).
func stampOrg(ctx context.Context, document interface{}) interface{} {
	org, cross := OrgFromContext(ctx)
	if cross {
		return document
	}
	data, err := bson.Marshal(document)
	if err != nil {
		return document
	}
	var d bson.D
	if err := bson.Unmarshal(data, &d); err != nil {
		return document
	}
	for i := range d {
		if d[i].Key == "org_id" {
			d[i].Value = org
			return d
		}
	}
	return append(d, bson.E{Key: "org_id", Value: org})
}

// ── mongo.Collection method surface used by the repositories ─────────────────

func (c *TenantCollection) Find(ctx context.Context, filter interface{}, opts ...*options.FindOptions) (*mongo.Cursor, error) {
	return c.col.Find(ctx, scopeFilter(ctx, filter), opts...)
}

func (c *TenantCollection) FindOne(ctx context.Context, filter interface{}, opts ...*options.FindOneOptions) *mongo.SingleResult {
	return c.col.FindOne(ctx, scopeFilter(ctx, filter), opts...)
}

func (c *TenantCollection) CountDocuments(ctx context.Context, filter interface{}, opts ...*options.CountOptions) (int64, error) {
	return c.col.CountDocuments(ctx, scopeFilter(ctx, filter), opts...)
}

func (c *TenantCollection) InsertOne(ctx context.Context, document interface{}, opts ...*options.InsertOneOptions) (*mongo.InsertOneResult, error) {
	return c.col.InsertOne(ctx, stampOrg(ctx, document), opts...)
}

func (c *TenantCollection) UpdateOne(ctx context.Context, filter, update interface{}, opts ...*options.UpdateOptions) (*mongo.UpdateResult, error) {
	return c.col.UpdateOne(ctx, scopeFilter(ctx, filter), update, opts...)
}

func (c *TenantCollection) UpdateMany(ctx context.Context, filter, update interface{}, opts ...*options.UpdateOptions) (*mongo.UpdateResult, error) {
	return c.col.UpdateMany(ctx, scopeFilter(ctx, filter), update, opts...)
}

func (c *TenantCollection) FindOneAndUpdate(ctx context.Context, filter, update interface{}, opts ...*options.FindOneAndUpdateOptions) *mongo.SingleResult {
	return c.col.FindOneAndUpdate(ctx, scopeFilter(ctx, filter), update, opts...)
}

func (c *TenantCollection) FindOneAndDelete(ctx context.Context, filter interface{}, opts ...*options.FindOneAndDeleteOptions) *mongo.SingleResult {
	return c.col.FindOneAndDelete(ctx, scopeFilter(ctx, filter), opts...)
}

func (c *TenantCollection) DeleteMany(ctx context.Context, filter interface{}, opts ...*options.DeleteOptions) (*mongo.DeleteResult, error) {
	return c.col.DeleteMany(ctx, scopeFilter(ctx, filter), opts...)
}

func (c *TenantCollection) DeleteOne(ctx context.Context, filter interface{}, opts ...*options.DeleteOptions) (*mongo.DeleteResult, error) {
	return c.col.DeleteOne(ctx, scopeFilter(ctx, filter), opts...)
}
