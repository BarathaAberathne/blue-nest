// cmd/seedusers/main.go — idempotently seeds the default admin (and optional
// default customer) read from environment variables.
//
// Run: cd backend && go run ./cmd/seedusers
//
// Env vars (all optional — if a block isn't set, that user is skipped):
//
//	DEFAULT_ADMIN_EMAIL
//	DEFAULT_ADMIN_PASSWORD
//	DEFAULT_ADMIN_FIRST_NAME   (default: "Admin")
//	DEFAULT_ADMIN_LAST_NAME    (default: "User")
//
//	DEFAULT_CUSTOMER_EMAIL
//	DEFAULT_CUSTOMER_PASSWORD
//	DEFAULT_CUSTOMER_FIRST_NAME (default: "Test")
//	DEFAULT_CUSTOMER_LAST_NAME  (default: "Customer")
//
// Idempotency: if a user with the email already exists, we leave their
// password alone and only ensure the role is correct (so re-running after a
// password change can't lock you out).
package main

import (
	"context"
	"errors"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	"github.com/blue-nest-montessori/api/internal/config"
	"github.com/blue-nest-montessori/api/internal/models"
	"github.com/joho/godotenv"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"golang.org/x/crypto/bcrypt"
)

type seedSpec struct {
	envPrefix   string // e.g. "DEFAULT_ADMIN" or "DEFAULT_CUSTOMER"
	role        models.Role
	defaultFN   string
	defaultLN   string
	branchSlugs []string // branch scope for scoped roles (regional/branch managers)
}

func main() {
	// Try common .env locations — same fallback list config.loadDotenv uses,
	// because seedusers reads DEFAULT_ADMIN_* directly via os.Getenv and so
	// can't wait for config.Load() to find the file later.
	for _, path := range []string{".env", "../.env", "../../.env"} {
		if err := godotenv.Load(path); err == nil {
			break
		}
	}

	cfg := config.Load()
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	client, err := mongo.Connect(ctx, options.Client().ApplyURI(cfg.Mongo.URI))
	if err != nil {
		log.Fatalf("connect: %v", err)
	}
	defer func() { _ = client.Disconnect(ctx) }()
	if err := client.Ping(ctx, nil); err != nil {
		log.Fatalf("ping: %v", err)
	}
	log.Printf("Connected → db=%s", cfg.Mongo.Database)

	col := client.Database(cfg.Mongo.Database).Collection("users")

	specs := []seedSpec{
		// The default admin is the system owner → super_admin. Re-running the seed
		// idempotently promotes an existing admin@... account from admin to
		// super_admin (see upsertUser role-fix below) — this is the migration.
		{envPrefix: "DEFAULT_ADMIN", role: models.RoleSuperAdmin, defaultFN: "Admin", defaultLN: "User"},
		{envPrefix: "DEFAULT_CUSTOMER", role: models.RoleCustomer, defaultFN: "Test", defaultLN: "Customer"},
		// Optional MD account for the executive Command Centre. Only seeded when
		// DEFAULT_DIRECTOR_EMAIL/PASSWORD are set (otherwise assign the role on
		// /admin/users). Director lands on /admin/command-center after login.
		{envPrefix: "DEFAULT_DIRECTOR", role: models.RoleDirector, defaultFN: "Managing", defaultLN: "Director"},
		// Optional branch-scoped demo accounts for the Branch Management System.
		// Regional Manager sees Northwood + Pinner + Pinner Green (not Harrow);
		// Branch Manager sees Harrow only. Seeded only when their env vars are set.
		{envPrefix: "DEFAULT_REGIONAL", role: models.RoleRegionalManager, defaultFN: "Regional", defaultLN: "Manager", branchSlugs: []string{"northwood", "pinner", "pinner-green"}},
		{envPrefix: "DEFAULT_BRANCH_MANAGER", role: models.RoleBranchManager, defaultFN: "Branch", defaultLN: "Manager", branchSlugs: []string{"harrow"}},
	}

	seededAny := false
	for _, s := range specs {
		email := strings.ToLower(strings.TrimSpace(os.Getenv(s.envPrefix + "_EMAIL")))
		password := os.Getenv(s.envPrefix + "_PASSWORD")
		if email == "" && password == "" {
			log.Printf("Skipping %s — neither %s_EMAIL nor %s_PASSWORD set", s.role, s.envPrefix, s.envPrefix)
			continue
		}
		if email == "" || password == "" {
			log.Printf("WARN %s — only one of %s_EMAIL / %s_PASSWORD set; both required, skipping", s.role, s.envPrefix, s.envPrefix)
			continue
		}
		if err := upsertUser(ctx, col, s.role, email, password,
			firstNonEmpty(os.Getenv(s.envPrefix+"_FIRST_NAME"), s.defaultFN),
			firstNonEmpty(os.Getenv(s.envPrefix+"_LAST_NAME"), s.defaultLN),
			s.branchSlugs,
		); err != nil {
			log.Fatalf("seed %s (%s): %v", s.role, email, err)
		}
		seededAny = true
	}

	if !seededAny {
		log.Println("\nNo default users seeded. Set DEFAULT_ADMIN_EMAIL/PASSWORD in .env to enable.")
		return
	}
	log.Println("\nUser seed complete ✓")
}

func upsertUser(ctx context.Context, col *mongo.Collection, role models.Role, email, password, firstName, lastName string, branchSlugs []string) error {
	if len(password) < 8 {
		return fmt.Errorf("password for %s must be at least 8 characters", email)
	}

	// Does the user already exist?
	var existing models.User
	err := col.FindOne(ctx, bson.M{"email": email}).Decode(&existing)
	if err == nil {
		// User exists — leave password alone, only fix role if needed.
		if existing.Role == role {
			log.Printf("  ✓ %-8s already correct: %s", role, email)
			return nil
		}
		if _, upErr := col.UpdateOne(ctx,
			bson.M{"_id": existing.ID},
			bson.M{"$set": bson.M{"role": role, "branch_slugs": branchSlugs, "updated_at": time.Now()}},
		); upErr != nil {
			return upErr
		}
		log.Printf("  ↻ %-8s role updated: %s (was %s)", role, email, existing.Role)
		return nil
	}
	if !errors.Is(err, mongo.ErrNoDocuments) {
		return fmt.Errorf("findByEmail: %w", err)
	}

	// Doesn't exist — create.
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	now := time.Now()
	user := models.User{
		ID:           primitive.NewObjectID(),
		Email:        email,
		PasswordHash: string(hash),
		FirstName:    firstName,
		LastName:     lastName,
		Role:         role,
		BranchSlugs:  branchSlugs,
		CreatedAt:    now,
		UpdatedAt:    now,
	}
	if _, err := col.InsertOne(ctx, user); err != nil {
		return err
	}
	log.Printf("  + %-8s created: %s (%s %s)", role, email, firstName, lastName)
	return nil
}

func firstNonEmpty(values ...string) string {
	for _, v := range values {
		if strings.TrimSpace(v) != "" {
			return v
		}
	}
	return ""
}
