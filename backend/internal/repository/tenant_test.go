package repository

import (
	"context"
	"testing"

	"go.mongodb.org/mongo-driver/bson"
)

// These tests lock down the multi-tenancy isolation invariant enforced by the
// TenantCollection wrapper: with a tenant in context, every read filter carries
// that org and every inserted document is stamped with it; a cross-org (system /
// platform) context never filters or stamps. A regression here would silently
// leak data across organisations, so it must fail the build.

// bkey extracts a key's value from a filter/document that may be a bson.M or a
// bson.D (scopeFilter/stampOrg can return either), plus whether it was present.
func bkey(v interface{}, key string) (interface{}, bool) {
	switch t := v.(type) {
	case bson.M:
		val, ok := t[key]
		return val, ok
	case bson.D:
		for _, e := range t {
			if e.Key == key {
				return e.Value, true
			}
		}
	}
	return nil, false
}

func TestOrgFromContext(t *testing.T) {
	t.Run("WithOrg pins the tenant", func(t *testing.T) {
		org, cross := OrgFromContext(WithOrg(context.Background(), "orgA"))
		if cross || org != "orgA" {
			t.Fatalf("want (orgA,false), got (%q,%v)", org, cross)
		}
	})
	t.Run("WithCrossOrg bypasses", func(t *testing.T) {
		org, cross := OrgFromContext(WithCrossOrg(context.Background()))
		if !cross || org != "" {
			t.Fatalf("want cross-org, got (%q,%v)", org, cross)
		}
	})
	t.Run("no org in context = cross-org (system paths)", func(t *testing.T) {
		if _, cross := OrgFromContext(context.Background()); !cross {
			t.Fatal("empty context must be cross-org so system/pre-auth paths work")
		}
	})
	t.Run("empty org string = cross-org", func(t *testing.T) {
		if _, cross := OrgFromContext(WithOrg(context.Background(), "")); !cross {
			t.Fatal("empty org id must be treated as cross-org")
		}
	})
}

func TestScopeFilter_InjectsOrg(t *testing.T) {
	ctx := WithOrg(context.Background(), "orgA")

	t.Run("bson.M gains org_id, keeps existing keys", func(t *testing.T) {
		out := scopeFilter(ctx, bson.M{"_id": "x", "status": "active"})
		if v, ok := bkey(out, "org_id"); !ok || v != "orgA" {
			t.Fatalf("org_id not injected: %v", out)
		}
		if v, ok := bkey(out, "_id"); !ok || v != "x" {
			t.Fatalf("existing _id lost: %v", out)
		}
		if v, _ := bkey(out, "status"); v != "active" {
			t.Fatalf("existing status lost: %v", out)
		}
	})

	t.Run("does not mutate the caller's map", func(t *testing.T) {
		in := bson.M{"_id": "x"}
		_ = scopeFilter(ctx, in)
		if _, ok := in["org_id"]; ok {
			t.Fatal("scopeFilter mutated the input filter")
		}
	})

	t.Run("bson.D gains org_id, keeps existing elements", func(t *testing.T) {
		out := scopeFilter(ctx, bson.D{{Key: "date", Value: "2026-07-19"}})
		if v, ok := bkey(out, "org_id"); !ok || v != "orgA" {
			t.Fatalf("org_id not injected into bson.D: %v", out)
		}
		if v, ok := bkey(out, "date"); !ok || v != "2026-07-19" {
			t.Fatalf("existing date lost from bson.D: %v", out)
		}
	})

	t.Run("nil filter becomes an org filter", func(t *testing.T) {
		if v, ok := bkey(scopeFilter(ctx, nil), "org_id"); !ok || v != "orgA" {
			t.Fatal("nil filter must become {org_id}")
		}
	})
}

func TestScopeFilter_CrossOrgBypass(t *testing.T) {
	ctx := WithCrossOrg(context.Background())
	in := bson.M{"_id": "x"}
	out := scopeFilter(ctx, in)
	if _, ok := bkey(out, "org_id"); ok {
		t.Fatal("cross-org context must NOT inject org_id")
	}
}

type stampDoc struct {
	OrgID string `bson:"org_id,omitempty"`
	Name  string `bson:"name"`
}

func TestStampOrg_Insert(t *testing.T) {
	ctx := WithOrg(context.Background(), "orgA")

	t.Run("struct doc is stamped with the tenant", func(t *testing.T) {
		if v, ok := bkey(stampOrg(ctx, stampDoc{Name: "Nova"}), "org_id"); !ok || v != "orgA" {
			t.Fatalf("struct not stamped: %v", stampOrg(ctx, stampDoc{Name: "Nova"}))
		}
	})

	t.Run("bson.M doc is stamped", func(t *testing.T) {
		if v, ok := bkey(stampOrg(ctx, bson.M{"name": "Nova"}), "org_id"); !ok || v != "orgA" {
			t.Fatal("bson.M doc not stamped")
		}
	})

	t.Run("an incoming org_id is overwritten with the caller's", func(t *testing.T) {
		if v, _ := bkey(stampOrg(ctx, bson.M{"org_id": "orgB", "name": "x"}), "org_id"); v != "orgA" {
			t.Fatalf("a document must be stamped with the CALLER's org, got %v", v)
		}
	})

	t.Run("cross-org insert is not stamped", func(t *testing.T) {
		out := stampOrg(WithCrossOrg(context.Background()), stampDoc{Name: "sys"})
		if v, ok := bkey(out, "org_id"); ok && v != "" {
			t.Fatalf("cross-org insert must not be stamped, got %v", v)
		}
	})
}
