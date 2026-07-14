package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Role string

const (
	RoleCustomer      Role = "customer"
	RoleStaff         Role = "staff"
	RoleBranchManager Role = "branch_manager"
	RoleAdmin         Role = "admin"
	RoleSuperAdmin    Role = "super_admin"
	// Specialist management roles (Phase 4). Each lands in the admin shell but
	// sees only the sections its permissions allow (see models/permission.go).
	RoleFinance     Role = "finance"     // analytics, spend, audit
	RoleAdmissions  Role = "admissions"  // enquiries / admissions CRM
	RoleProcurement Role = "procurement" // supply requests, purchase orders, suppliers
	// Executive oversight role: the Managing Director. Broad read/oversight access
	// (like a general manager, minus account management); lands on the MD Command
	// Centre. See models/permission.go for its permission set.
	RoleDirector Role = "director"
	// Branch-scoped management roles (Branch module, Phase B1). Regional spans
	// several assigned branches (User.BranchSlugs); Deputy assists a single branch.
	RoleRegionalManager Role = "regional_manager"
	RoleDeputyManager   Role = "deputy_manager"
	// Enterprise role catalogue (Phase B3). Practitioner/support tiers; each is
	// branch-scoped via User.BranchSlugs and governed by its permission set.
	RoleEYFSLead          Role = "eyfs_lead"
	RoleSENCO             Role = "senco"
	RoleOfficeAdmin       Role = "office_admin"
	RoleFinanceOfficer    Role = "finance_officer"
	RoleHROfficer         Role = "hr_officer"
	RoleAdmissionsOfficer Role = "admissions_officer"
	RoleRoomLeader        Role = "room_leader"
	RolePractitioner      Role = "practitioner"
	RoleApprentice        Role = "apprentice"
	RoleKitchen           Role = "kitchen"
	RoleMaintenance       Role = "maintenance"
	RoleExternalInspector Role = "external_inspector"
)

// ManagementRoles are every non-customer back-office role (they reach the admin
// shell; what they can do inside is governed by permissions).
var ManagementRoles = []Role{
	RoleSuperAdmin, RoleAdmin, RoleBranchManager,
	RoleFinance, RoleAdmissions, RoleProcurement, RoleStaff,
	RoleDirector, RoleRegionalManager, RoleDeputyManager,
	RoleEYFSLead, RoleSENCO, RoleOfficeAdmin, RoleFinanceOfficer, RoleHROfficer,
	RoleAdmissionsOfficer, RoleRoomLeader, RolePractitioner, RoleApprentice,
	RoleKitchen, RoleMaintenance, RoleExternalInspector,
}

type User struct {
	ID            primitive.ObjectID `bson:"_id,omitempty"           json:"id"`
	Email         string             `bson:"email"                   json:"email"`
	PasswordHash  string             `bson:"password_hash"           json:"-"`
	FirstName     string             `bson:"first_name"              json:"first_name"`
	LastName      string             `bson:"last_name"               json:"last_name"`
	Role          Role               `bson:"role"                    json:"role"`
	BranchSlugs   []string           `bson:"branch_slugs"            json:"branch_slugs,omitempty"`
	OAuthProvider string             `bson:"oauth_provider,omitempty" json:"oauth_provider,omitempty"`
	OAuthID       string             `bson:"oauth_id,omitempty"      json:"oauth_id,omitempty"`
	CreatedAt     time.Time          `bson:"created_at"              json:"created_at"`
	UpdatedAt     time.Time          `bson:"updated_at"              json:"updated_at"`
}

type RegisterRequest struct {
	Email     string `json:"email"      validate:"required,email"`
	Password  string `json:"password"   validate:"required,min=8"`
	FirstName string `json:"first_name" validate:"required"`
	LastName  string `json:"last_name"  validate:"required"`
}

type LoginRequest struct {
	Email    string `json:"email"    validate:"required,email"`
	Password string `json:"password" validate:"required"`
}

type AdminCreateUserRequest struct {
	Email       string   `json:"email"        validate:"required,email"`
	Password    string   `json:"password"     validate:"required,min=8"`
	FirstName   string   `json:"first_name"   validate:"required"`
	LastName    string   `json:"last_name"    validate:"required"`
	Role        Role     `json:"role"`
	BranchSlugs []string `json:"branch_slugs,omitempty"`
}

type AdminUpdateUserRequest struct {
	FirstName   string   `json:"first_name,omitempty"`
	LastName    string   `json:"last_name,omitempty"`
	Role        Role     `json:"role,omitempty"`
	BranchSlugs []string `json:"branch_slugs,omitempty"`
	// Optional: when non-empty, the user's password is reset to this value.
	Password string `json:"password,omitempty"`
}

// AdminResetPasswordRequest is the body for POST /admin/users/{id}/reset-password.
type AdminResetPasswordRequest struct {
	Password string `json:"password" validate:"required,min=8"`
}

type RefreshRequest struct {
	RefreshToken string `json:"refresh_token" validate:"required"`
}

type AuthResponse struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	User         User   `json:"user"`
}
