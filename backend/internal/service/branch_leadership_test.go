package service

// Regression locks for the branch Leadership fix (the "Dolvy scenario"):
//  1. branchService.SetManagers validates every assigned id against the
//     tenant's staff records (a bogus/cross-org id is rejected) but imposes
//     NO same-branch constraint — leadership is cross-branch by design, so a
//     Harrow-based area manager is assignable as another branch's regional
//     manager.
//  2. staffService.LeadershipCandidates returns the org-wide directory
//     (every branch), minimally projected, excluding left/archived staff.

import (
	"context"
	"errors"
	"strings"
	"testing"

	"github.com/blue-nest-montessori/api/internal/models"
	"github.com/blue-nest-montessori/api/internal/repository"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// fakeStaffDirectory resolves only the ids it was seeded with.
type fakeStaffDirectory struct{ known map[string]*models.Staff }

func (f *fakeStaffDirectory) FindByID(_ context.Context, id string) (*models.Staff, error) {
	if st, ok := f.known[id]; ok {
		return st, nil
	}
	return nil, errors.New("not found")
}

func TestValidateManagers(t *testing.T) {
	harrowID := primitive.NewObjectID().Hex()
	dir := &fakeStaffDirectory{known: map[string]*models.Staff{
		harrowID: {FirstName: "Dolvy", BranchSlug: "harrow"},
	}}
	svc := &branchService{staff: dir}
	ctx := context.Background()

	t.Run("empty assignment passes", func(t *testing.T) {
		if err := svc.validateManagers(ctx, models.BranchManagers{}); err != nil {
			t.Fatalf("empty managers should validate: %v", err)
		}
	})

	t.Run("cross-branch staff is assignable (no same-branch constraint)", func(t *testing.T) {
		// A Harrow employee assigned as ANOTHER branch's regional manager.
		if err := svc.validateManagers(ctx, models.BranchManagers{Regional: harrowID}); err != nil {
			t.Fatalf("cross-branch leadership must be allowed: %v", err)
		}
	})

	t.Run("unknown id is rejected and names the role", func(t *testing.T) {
		err := svc.validateManagers(ctx, models.BranchManagers{Regional: primitive.NewObjectID().Hex()})
		if err == nil {
			t.Fatal("bogus regional id must be rejected")
		}
		if !strings.Contains(err.Error(), "regional manager") {
			t.Fatalf("error should name the role, got: %v", err)
		}
	})

	t.Run("unknown key person is rejected", func(t *testing.T) {
		err := svc.validateManagers(ctx, models.BranchManagers{KeyPersons: []string{harrowID, "bogus"}})
		if err == nil {
			t.Fatal("bogus key person id must be rejected")
		}
	})

	t.Run("nil directory skips validation (nil-safe)", func(t *testing.T) {
		nilSvc := &branchService{}
		if err := nilSvc.validateManagers(ctx, models.BranchManagers{Regional: "anything"}); err != nil {
			t.Fatalf("nil staff directory must be nil-safe: %v", err)
		}
	})
}

// fakeStaffRepo backs LeadershipCandidates: only FindAll is meaningful.
type fakeStaffRepo struct{ rows []models.Staff }

func (f *fakeStaffRepo) Create(context.Context, *models.Staff) error { return errors.New("unused") }
func (f *fakeStaffRepo) FindAll(_ context.Context, _ repository.StaffFilter) ([]models.Staff, error) {
	return f.rows, nil
}
func (f *fakeStaffRepo) FindByID(context.Context, string) (*models.Staff, error) {
	return nil, errors.New("unused")
}
func (f *fakeStaffRepo) Update(context.Context, string, models.Staff) (*models.Staff, error) {
	return nil, errors.New("unused")
}
func (f *fakeStaffRepo) SetPhoto(context.Context, string, string) (*models.Staff, error) {
	return nil, errors.New("unused")
}
func (f *fakeStaffRepo) FindByUserID(context.Context, string) (*models.Staff, error) {
	return nil, errors.New("unused")
}
func (f *fakeStaffRepo) SetPINHash(context.Context, string, string) error {
	return errors.New("unused")
}
func (f *fakeStaffRepo) Delete(context.Context, string) error { return errors.New("unused") }

func TestLeadershipCandidates(t *testing.T) {
	rows := []models.Staff{
		{ID: primitive.NewObjectID(), FirstName: "Dolvy", LastName: "A", JobTitle: "Area Manager", BranchSlug: "harrow", Status: models.StaffActive},
		{ID: primitive.NewObjectID(), FirstName: "Sam", LastName: "B", JobTitle: "Deputy", BranchSlug: "aldershot", Status: models.StaffOnLeave},
		{ID: primitive.NewObjectID(), FirstName: "Gone", LastName: "C", JobTitle: "Manager", BranchSlug: "pinner", Status: models.StaffInactive},
	}
	svc := &staffService{repo: &fakeStaffRepo{rows: rows}}

	out, err := svc.LeadershipCandidates(context.Background())
	if err != nil {
		t.Fatalf("LeadershipCandidates: %v", err)
	}
	if len(out) != 2 {
		t.Fatalf("want 2 candidates (inactive excluded), got %d", len(out))
	}
	branches := map[string]bool{}
	for _, c := range out {
		branches[c.BranchSlug] = true
		if c.FirstName == "Gone" {
			t.Fatal("inactive (left) staff must not be assignable")
		}
	}
	if !branches["harrow"] || !branches["aldershot"] {
		t.Fatalf("directory must span every branch, got %v", branches)
	}
}
