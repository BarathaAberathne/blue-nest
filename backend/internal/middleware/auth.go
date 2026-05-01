package middleware

import (
	"context"
	"net/http"
	"strings"

	"github.com/blue-nest-montessori/api/pkg/response"
	"github.com/golang-jwt/jwt/v5"
)

type contextKey string

const UserIDKey contextKey = "userID"
const UserRoleKey contextKey = "userRole"

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
			if userID == "" || role == "" {
				response.Unauthorized(w, "invalid token claims")
				return
			}

			ctx := context.WithValue(r.Context(), UserIDKey, userID)
			ctx = context.WithValue(ctx, UserRoleKey, role)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func AdminOnly(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		role, _ := r.Context().Value(UserRoleKey).(string)
		if role != "admin" && role != "branch_manager" {
			response.Forbidden(w, "admin access required")
			return
		}
		next.ServeHTTP(w, r)
	})
}

func SuperAdminOnly(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		role, _ := r.Context().Value(UserRoleKey).(string)
		if role != "admin" {
			response.Forbidden(w, "super admin access required")
			return
		}
		next.ServeHTTP(w, r)
	})
}
