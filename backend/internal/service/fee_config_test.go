package service

import (
	"context"
	"strings"
	"testing"

	"github.com/blue-nest-montessori/api/internal/models"
	"go.mongodb.org/mongo-driver/bson"
)

// fakeFeeConfigRepo returns a canned set of fee-config docs and records upserts.
type fakeFeeConfigRepo struct {
	docs     []models.FeeConfig
	upserted []string
}

func (f *fakeFeeConfigRepo) FindAll(ctx context.Context) ([]models.FeeConfig, error) {
	return f.docs, nil
}
func (f *fakeFeeConfigRepo) FindByBranch(ctx context.Context, branch string) (*models.FeeConfig, error) {
	for i := range f.docs {
		if f.docs[i].BranchSlug == branch {
			return &f.docs[i], nil
		}
	}
	return nil, nil
}
func (f *fakeFeeConfigRepo) Upsert(ctx context.Context, branch string, set bson.M) (*models.FeeConfig, error) {
	f.upserted = append(f.upserted, branch)
	return &models.FeeConfig{BranchSlug: branch}, nil
}
func (f *fakeFeeConfigRepo) DeleteByBranch(ctx context.Context, branch string) (int64, error) {
	for i := range f.docs {
		if f.docs[i].BranchSlug == branch {
			f.docs = append(f.docs[:i], f.docs[i+1:]...)
			return 1, nil
		}
	}
	return 0, nil
}

// fakeBranchRepoFees serves a fixed non-archived branch roster; the other
// BranchRepository methods are unused by FeeConfigService.
type fakeBranchRepoFees struct{ slugs []string }

func (f *fakeBranchRepoFees) FindAll(ctx context.Context) ([]models.Branch, error) {
	out := make([]models.Branch, 0, len(f.slugs))
	for _, s := range f.slugs {
		out = append(out, models.Branch{Slug: s})
	}
	return out, nil
}
func (f *fakeBranchRepoFees) FindAllAdmin(ctx context.Context, includeArchived bool) ([]models.Branch, error) {
	return f.FindAll(ctx)
}
func (f *fakeBranchRepoFees) FindBySlug(ctx context.Context, slug string) (*models.Branch, error) {
	return nil, nil
}
func (f *fakeBranchRepoFees) Create(ctx context.Context, b *models.Branch) error { return nil }
func (f *fakeBranchRepoFees) Update(ctx context.Context, slug string, b models.Branch) (*models.Branch, error) {
	return nil, nil
}
func (f *fakeBranchRepoFees) SetManagers(ctx context.Context, slug string, m models.BranchManagers) (*models.Branch, error) {
	return nil, nil
}
func (f *fakeBranchRepoFees) Archive(ctx context.Context, slug string, archived bool) error {
	return nil
}
func (f *fakeBranchRepoFees) UpdateGoogleCache(ctx context.Context, slug string, rating float64, reviewCount int) error {
	return nil
}

// The bundle must only serve configs for branches that actually exist — an
// orphan doc (deleted/renamed branch, or QA test debris) is invisible on both
// the public calculator and the admin fees editor.
func TestFeeConfigBundleFiltersOrphanBranches(t *testing.T) {
	repo := &fakeFeeConfigRepo{docs: []models.FeeConfig{
		{BranchSlug: "harrow"},
		{BranchSlug: "qatestfees"}, // orphan: no such branch
		{BranchSlug: ""},           // org-wide meta doc
	}}
	svc := NewFeeConfigService(repo, &fakeBranchRepoFees{slugs: []string{"harrow", "pinner"}})

	bundle, err := svc.Bundle(context.Background())
	if err != nil {
		t.Fatalf("Bundle: %v", err)
	}
	if _, ok := bundle.Branches["harrow"]; !ok {
		t.Errorf("expected harrow in bundle")
	}
	if _, ok := bundle.Branches["qatestfees"]; ok {
		t.Errorf("orphan qatestfees must be filtered from the bundle")
	}
	if bundle.Meta == nil {
		t.Errorf("meta must survive filtering")
	}

	list, err := svc.List(context.Background())
	if err != nil {
		t.Fatalf("List: %v", err)
	}
	for _, c := range list {
		if c.BranchSlug == "qatestfees" {
			t.Errorf("orphan qatestfees must be filtered from List")
		}
	}
}

// Saving rates against a branch that doesn't exist must be rejected — fee
// configs can never be created for phantom branches again.
func TestFeeConfigUpsertRejectsUnknownBranch(t *testing.T) {
	repo := &fakeFeeConfigRepo{}
	svc := NewFeeConfigService(repo, &fakeBranchRepoFees{slugs: []string{"harrow"}})

	if _, err := svc.UpsertBranch(context.Background(), "no-such-branch", models.FeeConfigRequest{}); err == nil {
		t.Fatalf("expected error for unknown branch")
	} else if !strings.Contains(err.Error(), "unknown branch") {
		t.Errorf("unexpected error: %v", err)
	}
	if len(repo.upserted) != 0 {
		t.Errorf("no upsert should have happened, got %v", repo.upserted)
	}

	if _, err := svc.UpsertBranch(context.Background(), "harrow", models.FeeConfigRequest{}); err != nil {
		t.Fatalf("real branch upsert should succeed: %v", err)
	}
}

// DeleteBranch prunes any branch doc — including orphans whose branch no
// longer exists (its whole point) — but never the ""-slug org meta doc.
func TestFeeConfigDeleteBranch(t *testing.T) {
	repo := &fakeFeeConfigRepo{docs: []models.FeeConfig{
		{BranchSlug: "qatestfees"}, // orphan
		{BranchSlug: ""},           // org-wide meta
	}}
	svc := NewFeeConfigService(repo, &fakeBranchRepoFees{slugs: []string{"harrow"}})

	if removed, err := svc.DeleteBranch(context.Background(), "qatestfees"); err != nil || !removed {
		t.Fatalf("orphan delete should succeed, removed=%v err=%v", removed, err)
	}
	if removed, err := svc.DeleteBranch(context.Background(), "qatestfees"); err != nil || removed {
		t.Fatalf("second delete should report nothing removed, removed=%v err=%v", removed, err)
	}
	if _, err := svc.DeleteBranch(context.Background(), ""); err == nil {
		t.Fatalf("deleting the meta doc must be rejected")
	}
	if len(repo.docs) != 1 || repo.docs[0].BranchSlug != "" {
		t.Fatalf("meta doc must survive, docs=%v", repo.docs)
	}
}
