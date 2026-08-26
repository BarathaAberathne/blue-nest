package service

// Regression locks for the job-title/system-role consistency fix (the Dolvy
// mismatch): user.role is the SINGLE source of truth for the system role, and
// staff reads project it live (Staff.LoginRole, bson:"-") so the staff
// profile and the users page can never show two different answers.

import (
	"context"
	"errors"
	"testing"

	"github.com/blue-nest-montessori/api/internal/models"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// fakeStaffAccounts satisfies StaffAccounts; only FindUserByID matters here.
type fakeStaffAccounts struct{ users map[string]*models.User }

func (f *fakeStaffAccounts) CreateAdminUser(context.Context, models.AdminCreateUserRequest) (*models.User, error) {
	return nil, errors.New("unused")
}
func (f *fakeStaffAccounts) UpdateUser(context.Context, string, models.AdminUpdateUserRequest) (*models.User, error) {
	return nil, errors.New("unused")
}
func (f *fakeStaffAccounts) FindUserByEmail(context.Context, string) (*models.User, error) {
	return nil, errors.New("unused")
}
func (f *fakeStaffAccounts) FindUserByID(_ context.Context, id string) (*models.User, error) {
	if u, ok := f.users[id]; ok {
		return u, nil
	}
	return nil, errors.New("not found")
}

func TestResolveLoginRole(t *testing.T) {
	uid := primitive.NewObjectID().Hex()
	svc := &staffService{accounts: &fakeStaffAccounts{users: map[string]*models.User{
		uid: {Role: models.RoleRegionalManager},
	}}}

	t.Run("linked account projects its live role", func(t *testing.T) {
		st := &models.Staff{UserID: uid, JobTitle: "Nursery Manager"}
		svc.resolveLoginRole(context.Background(), st)
		if st.LoginRole != models.RoleRegionalManager {
			t.Fatalf("want regional_manager projected, got %q", st.LoginRole)
		}
	})

	t.Run("no login linked leaves the projection empty", func(t *testing.T) {
		st := &models.Staff{JobTitle: "Practitioner"}
		svc.resolveLoginRole(context.Background(), st)
		if st.LoginRole != "" {
			t.Fatalf("HR-only record must have empty LoginRole, got %q", st.LoginRole)
		}
	})

	t.Run("deleted account is best-effort empty, not an error", func(t *testing.T) {
		st := &models.Staff{UserID: primitive.NewObjectID().Hex()}
		svc.resolveLoginRole(context.Background(), st)
		if st.LoginRole != "" {
			t.Fatalf("missing user must leave LoginRole empty, got %q", st.LoginRole)
		}
	})

	t.Run("nil accounts dependency is nil-safe", func(t *testing.T) {
		nilSvc := &staffService{}
		st := &models.Staff{UserID: uid}
		nilSvc.resolveLoginRole(context.Background(), st)
		if st.LoginRole != "" {
			t.Fatalf("nil accounts must be a no-op, got %q", st.LoginRole)
		}
	})
}
