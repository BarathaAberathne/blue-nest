package handler

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"

	"github.com/blue-nest-montessori/api/internal/config"
	"github.com/blue-nest-montessori/api/internal/models"
	"github.com/blue-nest-montessori/api/internal/service"
	"github.com/blue-nest-montessori/api/pkg/response"
	"github.com/blue-nest-montessori/api/pkg/validator"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
)

type AuthHandler struct {
	svc         service.AuthService
	googleCfg   *oauth2.Config
	frontendURL string
}

func NewAuthHandler(svc service.AuthService, cfg *config.Config) *AuthHandler {
	var googleOAuth *oauth2.Config

	if cfg.Google.ClientID != "" {
		googleOAuth = &oauth2.Config{
			ClientID:     cfg.Google.ClientID,
			ClientSecret: cfg.Google.ClientSecret,
			RedirectURL:  cfg.Google.RedirectURL,
			Scopes:       []string{"openid", "email", "profile"},
			Endpoint:     google.Endpoint,
		}
	} else {
		// Placeholder so routes compile even without real credentials
		googleOAuth = &oauth2.Config{
			ClientID:     "placeholder-google-client-id",
			ClientSecret: "placeholder-google-client-secret",
			RedirectURL:  cfg.Google.RedirectURL,
			Scopes:       []string{"openid", "email", "profile"},
			Endpoint:     google.Endpoint,
		}
	}

	return &AuthHandler{
		svc:         svc,
		googleCfg:   googleOAuth,
		frontendURL: cfg.FrontendURL,
	}
}

func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	var req models.RegisterRequest
	if err := validator.DecodeJSON(r, &req); err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	res, err := h.svc.Register(r.Context(), req)
	if err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	response.Created(w, res)
}

func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req models.LoginRequest
	if err := validator.DecodeJSON(r, &req); err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	res, err := h.svc.Login(r.Context(), req)
	if err != nil {
		response.Unauthorized(w, err.Error())
		return
	}
	response.OK(w, res)
}

func (h *AuthHandler) AdminLogin(w http.ResponseWriter, r *http.Request) {
	var req models.LoginRequest
	if err := validator.DecodeJSON(r, &req); err != nil {
		response.BadRequest(w, err.Error())
		return
	}

	res, err := h.svc.AdminLogin(r.Context(), req)
	if err != nil {
		response.Unauthorized(w, err.Error())
		return
	}

	response.OK(w, res)
}

func (h *AuthHandler) Logout(w http.ResponseWriter, r *http.Request) {
	response.OK(w, map[string]string{"message": "logged out"})
}

func (h *AuthHandler) Refresh(w http.ResponseWriter, r *http.Request) {
	var req models.RefreshRequest
	if err := validator.DecodeJSON(r, &req); err != nil {
		response.BadRequest(w, err.Error())
		return
	}

	res, err := h.svc.Refresh(r.Context(), req.RefreshToken)
	if err != nil {
		response.Unauthorized(w, err.Error())
		return
	}
	response.OK(w, res)
}

// ── OAuth helpers ─────────────────────────────────────────────────────────────

func generateState() (string, error) {
	b := make([]byte, 16)
	if _, err := io.ReadFull(rand.Reader, b); err != nil {
		return "", err
	}
	return base64.URLEncoding.EncodeToString(b), nil
}

func setStateCookie(w http.ResponseWriter, state string) {
	http.SetCookie(w, &http.Cookie{
		Name:     "oauth_state",
		Value:    state,
		Path:     "/",
		MaxAge:   900, // 15 minutes
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
	})
}

func verifyState(r *http.Request) bool {
	cookie, err := r.Cookie("oauth_state")
	if err != nil {
		return false
	}
	return cookie.Value == r.URL.Query().Get("state")
}

func clearStateCookie(w http.ResponseWriter) {
	http.SetCookie(w, &http.Cookie{
		Name:     "oauth_state",
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		HttpOnly: true,
	})
}

// ── Google OAuth ──────────────────────────────────────────────────────────────

func (h *AuthHandler) GoogleLogin(w http.ResponseWriter, r *http.Request) {
	state, err := generateState()
	if err != nil {
		response.InternalError(w, "failed to generate state")
		return
	}
	setStateCookie(w, state)
	url := h.googleCfg.AuthCodeURL(state, oauth2.AccessTypeOffline)
	http.Redirect(w, r, url, http.StatusTemporaryRedirect)
}

type googleUserInfo struct {
	ID         string `json:"sub"`
	Email      string `json:"email"`
	Name       string `json:"name"`
	GivenName  string `json:"given_name"`
	FamilyName string `json:"family_name"`
}

func (h *AuthHandler) GoogleCallback(w http.ResponseWriter, r *http.Request) {
	if !verifyState(r) {
		response.BadRequest(w, "state mismatch — possible CSRF")
		return
	}
	clearStateCookie(w)

	code := r.URL.Query().Get("code")
	if code == "" {
		response.BadRequest(w, "missing code parameter")
		return
	}

	token, err := h.googleCfg.Exchange(context.Background(), code)
	if err != nil {
		response.BadRequest(w, fmt.Sprintf("failed to exchange code: %v", err))
		return
	}

	client := h.googleCfg.Client(context.Background(), token)
	resp, err := client.Get("https://www.googleapis.com/oauth2/v3/userinfo")
	if err != nil {
		response.InternalError(w, "failed to fetch user info")
		return
	}
	defer resp.Body.Close()

	var info googleUserInfo
	if err := json.NewDecoder(resp.Body).Decode(&info); err != nil {
		response.InternalError(w, "failed to decode user info")
		return
	}

	firstName := info.GivenName
	lastName := info.FamilyName
	if firstName == "" && info.Name != "" {
		parts := strings.SplitN(info.Name, " ", 2)
		firstName = parts[0]
		if len(parts) > 1 {
			lastName = parts[1]
		}
	}

	authResp, err := h.svc.UpsertOAuthUser(r.Context(), info.Email, firstName, lastName, "google", info.ID)
	if err != nil {
		response.InternalError(w, "failed to upsert user")
		return
	}

	redirectURL := fmt.Sprintf("%s/auth/callback?token=%s&refresh=%s",
		h.frontendURL, authResp.AccessToken, authResp.RefreshToken)
	http.Redirect(w, r, redirectURL, http.StatusTemporaryRedirect)
}
