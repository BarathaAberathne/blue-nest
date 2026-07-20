package middleware

import (
	"context"
	"net/http"
	"strings"

	"github.com/blue-nest-montessori/api/internal/models"
	"github.com/blue-nest-montessori/api/internal/repository"
	"github.com/blue-nest-montessori/api/pkg/response"
	"github.com/golang-jwt/jwt/v5"
)

// DefaultTenant pins requests that don't authenticate (public store, blog,
// public branch pages) to the default organisation so they keep serving that
// tenant's data. Authenticated routes' Auth middleware runs later and overrides
// this with the caller's own org. Host-based tenant resolution lands in T1.
func DefaultTenant(defaultOrgID string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			next.ServeHTTP(w, r.WithContext(repository.WithOrg(r.Context(), defaultOrgID)))
		})
	}
}

type contextKey string

const UserIDKey contextKey = "userID"
const UserRoleKey contextKey = "userRole"
const UserEmailKey contextKey = "userEmail"
const UserBranchesKey contextKey = "userBranches"
const UserOrgKey contextKey = "userOrg"

func Auth(jwtSecret string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			header := r.Header.Get("Authorization")
			if !strings.HasPrefix(header, "Bearer ") {
				response.Unauthorized(w, "missing or invalid authorization header")
				return
			}

			tokenStr := strings.TrimPrefix(header, "Bearer ")
			token, err := jwt.Parse(tokenStr, func(t *jwt.Token) (interface{}, error) {
				if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
					return nil, jwt.ErrSignatureInvalid
				}
				return []byte(jwtSecret), nil
			})
			if err != nil || !token.Valid {
				response.Unauthorized(w, "invalid or expired token")
				return
			}

			claims, ok := token.Claims.(jwt.MapClaims)
			if !ok {
				response.Unauthorized(w, "invalid token claims")
				return
			}

			userID, _ := claims["sub"].(string)
			role, _ := claims["role"].(string)
			email, _ := claims["email"].(string)
			if userID == "" || role == "" {
				response.Unauthorized(w, "invalid token claims")
				return
			}

			// branch_slugs is a JSON array in the token; normalise to []string.
			var branches []string
			if raw, ok := claims["branch_slugs"].([]interface{}); ok {
				for _, v := range raw {
					if s, ok := v.(string); ok {
						branches = append(branches, s)
					}
				}
			}
			orgID, _ := claims["org_id"].(string)

			ctx := context.WithValue(r.Context(), UserIDKey, userID)
			ctx = context.WithValue(ctx, UserRoleKey, role)
			ctx = context.WithValue(ctx, UserEmailKey, email)
			ctx = context.WithValue(ctx, UserBranchesKey, branches)
			ctx = context.WithValue(ctx, UserOrgKey, orgID)
			// Pin the request to the caller's tenant so every repository read/write
			// is org-scoped. The platform operator runs cross-tenant.
			if role == string(models.RolePlatformSuperAdmin) {
				ctx = repository.WithCrossOrg(ctx)
			} else {
				ctx = repository.WithOrg(ctx, orgID)
			}
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// RequireRole returns middleware that allows only the given roles. Centralizing
// the check here keeps route guards declarative as the role set grows.
func RequireRole(allowed ...string) func(http.Handler) http.Handler {
	allowedSet := make(map[string]struct{}, len(allowed))
	for _, role := range allowed {
		allowedSet[role] = struct{}{}
	}
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			role, _ := r.Context().Value(UserRoleKey).(string)
			if _, ok := allowedSet[role]; !ok {
				response.Forbidden(w, "insufficient permissions")
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

// AdminOnly permits the general management roles (everything above staff/customer).
func AdminOnly(next http.Handler) http.Handler {
	return RequireRole("super_admin", "admin", "branch_manager")(next)
}

// ManagementOnly permits every back-office management role (the general managers
// plus the Phase-4 specialists). It is the outer gate on the admin route group;
// individual resources are then gated by RequirePermission, so a specialist role
// only reaches the sections its permission set allows.
// ManagementOnly is the outer gate on the admin management route group. It
// admits every back-office role — all built-in management roles (incl. director,
// regional/deputy manager and the specialist officers) plus any custom role —
// and leaves the per-resource RequirePermission middleware to scope what each
// one can actually do. Only parent/customers and staff (who have their own
// supply-request portal) are excluded.
func ManagementOnly(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		role, _ := r.Context().Value(UserRoleKey).(string)
		if role == "" || role == "customer" || role == "staff" {
			response.Forbidden(w, "insufficient permissions")
			return
		}
		next.ServeHTTP(w, r)
	})
}

// SuperAdminOnly permits only the top-level super admin (account management).
func SuperAdminOnly(next http.Handler) http.Handler {
	return RequireRole("super_admin")(next)
}

// PlatformOnly permits only the cross-tenant SaaS operator (managing the list of
// organisations, platform-wide settings).
func PlatformOnly(next http.Handler) http.Handler {
	return RequireRole(string(models.RolePlatformSuperAdmin))(next)
}

// RequirePermission gates a route on a granular permission, resolved from the
// caller's role via the central role→permission map (models.HasPermission).
func RequirePermission(perm models.Permission) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			role, _ := r.Context().Value(UserRoleKey).(string)
			if !models.HasPermission(models.Role(role), perm) {
				response.Forbidden(w, "insufficient permissions")
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}
