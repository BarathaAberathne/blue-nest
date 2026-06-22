package admin

import (
	"net/http"

	"github.com/blue-nest-montessori/api/internal/middleware"
	"github.com/blue-nest-montessori/api/internal/models"
	"github.com/blue-nest-montessori/api/internal/service"
	"github.com/blue-nest-montessori/api/pkg/response"
	"github.com/blue-nest-montessori/api/pkg/validator"
	"github.com/go-chi/chi/v5"
)

type AdminPurchaseCartHandler struct {
	svc   service.PurchaseCartService
	audit service.AuditService
}

func NewAdminPurchaseCartHandler(svc service.PurchaseCartService, audit service.AuditService) *AdminPurchaseCartHandler {
	return &AdminPurchaseCartHandler{svc: svc, audit: audit}
}

// Generate turns the selected supply requests into per-supplier draft carts.
func (h *AdminPurchaseCartHandler) Generate(w http.ResponseWriter, r *http.Request) {
	var req models.GenerateCartRequest
	if err := validator.DecodeJSON(r, &req); err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	actor, _ := r.Context().Value(middleware.UserEmailKey).(string)

	carts, err := h.svc.Generate(r.Context(), req.RequestIDs, actor)
	if err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	h.audit.Record(r, "generate", "purchase_cart", "",
		"Generated supplier cart(s) from requests",
		map[string]interface{}{"request_ids": req.RequestIDs, "carts": len(carts)})
	response.Created(w, carts)
}

func (h *AdminPurchaseCartHandler) List(w http.ResponseWriter, r *http.Request) {
	carts, err := h.svc.List(r.Context())
	if err != nil {
		response.InternalError(w, "failed to fetch carts")
		return
	}
	response.OK(w, carts)
}

func (h *AdminPurchaseCartHandler) Get(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	cart, err := h.svc.GetByID(r.Context(), id)
	if err != nil {
		response.NotFound(w, "cart not found")
		return
	}
	response.OK(w, cart)
}

func (h *AdminPurchaseCartHandler) Update(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var req models.UpdateCartRequest
	if err := validator.DecodeJSON(r, &req); err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	updated, err := h.svc.Update(r.Context(), id, req)
	if err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	h.audit.Record(r, "update", "purchase_cart", id, "Edited generated cart", nil)
	response.OK(w, updated)
}

// Send emails the cart to the supplier and marks the covered requests ordered.
func (h *AdminPurchaseCartHandler) Send(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var body struct {
		RecipientEmail string `json:"recipient_email"`
	}
	_ = validator.DecodeJSON(r, &body) // optional override

	sent, err := h.svc.Send(r.Context(), id, body.RecipientEmail)
	if err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	h.audit.Record(r, "send", "purchase_cart", id,
		"Emailed "+sent.Supplier+" order to "+sent.RecipientEmail, nil)
	response.OK(w, sent)
}
