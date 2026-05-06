package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Role string

const (
	RoleCustomer      Role = "customer"
	RoleAdmin         Role = "admin"
	RoleBranchManager Role = "branch_manager"
)

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
}

type RefreshRequest struct {
	RefreshToken string `json:"refresh_token" validate:"required"`
}

type AuthResponse struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	User         User   `json:"user"`
}
