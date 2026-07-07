package admin

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

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

// Exported is posted by the browser extension after it fills the Gompels cart:
// records per-line results, marks the cart sent, flips requests to ordered.
func (h *AdminPurchaseCartHandler) Exported(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var body models.ExportedRequest
	if err := validator.DecodeJSON(r, &body); err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	cart, err := h.svc.MarkExported(r.Context(), id, body.Results, body.SupplierOrderRef)
	if err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	added := 0
	for _, res := range body.Results {
		if res.Status == "added" {
			added++
		}
	}
	h.audit.Record(r, "export", "purchase_cart", id,
		fmt.Sprintf("Pushed %s cart to Gompels (%d/%d added)", cart.Supplier, added, len(body.Results)), nil)
	response.OK(w, cart)
}

// UpdateFulfillment records the supplier order ref + expected delivery date on a
// placed order (propagates the date to staff).
func (h *AdminPurchaseCartHandler) UpdateFulfillment(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var req models.UpdateFulfillmentRequest
	if err := validator.DecodeJSON(r, &req); err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	cart, err := h.svc.UpdateFulfillment(r.Context(), id, req)
	if err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	h.audit.Record(r, "update", "purchase_cart", id, "Updated delivery details", nil)
	response.OK(w, cart)
}

// attachmentExts are the file types allowed for order-confirmation attachments.
var attachmentExts = map[string]bool{
	".pdf": true, ".jpg": true, ".jpeg": true, ".png": true, ".webp": true, ".gif": true, ".csv": true,
}

// AddAttachment saves an uploaded file (order confirmation / invoice) against a
// placed purchase order.
func (h *AdminPurchaseCartHandler) AddAttachment(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if err := r.ParseMultipartForm(15 << 20); err != nil {
		response.BadRequest(w, "file too large or invalid form")
		return
	}
	file, header, err := r.FormFile("file")
	if err != nil {
		response.BadRequest(w, "file field required")
		return
	}
	defer file.Close()

	ext := strings.ToLower(filepath.Ext(header.Filename))
	if !attachmentExts[ext] {
		response.BadRequest(w, "unsupported type: use pdf, jpg, png, webp, gif or csv")
		return
	}

	stored := fmt.Sprintf("po-%s-%d%s", id, time.Now().UnixNano(), ext)
	dst, err := os.Create(filepath.Join("uploads", stored))
	if err != nil {
		response.InternalError(w, "failed to save file")
		return
	}
	defer dst.Close()
	if _, err := io.Copy(dst, file); err != nil {
		response.InternalError(w, "failed to write file")
		return
	}

	scheme := "http"
	if r.Header.Get("X-Forwarded-Proto") == "https" {
		scheme = "https"
	}
	host := r.Header.Get("X-Forwarded-Host")
	if host == "" {
		host = r.Host
	}
	att := models.PurchaseCartAttachment{
		Name: header.Filename,
		URL:  fmt.Sprintf("%s://%s/uploads/%s", scheme, host, stored),
	}
	cart, err := h.svc.AddAttachment(r.Context(), id, att)
	if err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	h.audit.Record(r, "attach", "purchase_cart", id, "Attached "+header.Filename, nil)
	response.OK(w, cart)
}

// UpdateStatus applies a manual workflow transition (placed → tracking →
// dispatched → completed / cancelled) from the board + stepper.
func (h *AdminPurchaseCartHandler) UpdateStatus(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var body models.UpdatePurchaseCartStatusRequest
	if err := validator.DecodeJSON(r, &body); err != nil || body.Status == "" {
		response.BadRequest(w, "status is required")
		return
	}
	cart, err := h.svc.SetStatus(r.Context(), id, body.Status)
	if err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	h.audit.Record(r, "update_status", "purchase_cart", id, "Set order status to "+body.Status,
		map[string]interface{}{"status": body.Status})
	response.OK(w, cart)
}

// Receive records per-line goods-received quantities and advances the order's
// status (partially_received | received).
func (h *AdminPurchaseCartHandler) Receive(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var req models.ReceiveRequest
	if err := validator.DecodeJSON(r, &req); err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	cart, err := h.svc.Receive(r.Context(), id, req.Items)
	if err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	h.audit.Record(r, "receive", "purchase_cart", id,
		fmt.Sprintf("Recorded goods received (%s)", cart.Status), nil)
	response.OK(w, cart)
}
