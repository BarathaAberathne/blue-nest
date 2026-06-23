package admin

import (
	"bytes"
	"net/http"
	"strings"

	"github.com/blue-nest-montessori/api/internal/models"
	"github.com/blue-nest-montessori/api/internal/service"
	"github.com/blue-nest-montessori/api/pkg/response"
	"github.com/blue-nest-montessori/api/pkg/validator"
	"github.com/go-chi/chi/v5"
)

type AdminProductHandler struct {
	svc   service.ProductService
	audit service.AuditService
}

func NewAdminProductHandler(svc service.ProductService, audit service.AuditService) *AdminProductHandler {
	return &AdminProductHandler{svc: svc, audit: audit}
}

func (h *AdminProductHandler) List(w http.ResponseWriter, r *http.Request) {
	products, err := h.svc.ListAdmin(r.Context())
	if err != nil {
		response.InternalError(w, err.Error())
		return
	}
	response.OK(w, products)
}

func (h *AdminProductHandler) ImportCSV(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseMultipartForm(10 << 20); err != nil {
		response.BadRequest(w, "invalid multipart form")
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		response.BadRequest(w, "missing file")
		return
	}
	defer file.Close()

	filename := strings.ToLower(header.Filename)
	if strings.HasSuffix(filename, ".xlsx") {
		response.BadRequest(w, "xlsx upload is not supported yet; please upload CSV")
		return
	}
	if !strings.HasSuffix(filename, ".csv") {
		response.BadRequest(w, "unsupported file type; upload a .csv file")
		return
	}

	buf := new(bytes.Buffer)
	if _, err := buf.ReadFrom(file); err != nil {
		response.BadRequest(w, "failed to read file")
		return
	}

	summary, err := h.svc.ImportCSV(r.Context(), buf.Bytes())
	if err != nil {
		if summary != nil {
			response.JSON(w, http.StatusBadRequest, response.Envelope{
				Error: err.Error(),
				Data:  summary,
			})
			return
		}
		response.BadRequest(w, err.Error())
		return
	}

	h.audit.Record(r, "import", "product", "",
		"Imported products from CSV", map[string]interface{}{"summary": summary})
	response.OK(w, summary)
}

func (h *AdminProductHandler) Create(w http.ResponseWriter, r *http.Request) {
	var p models.Product
	if err := validator.DecodeJSON(r, &p); err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	created, err := h.svc.Create(r.Context(), p)
	if err != nil {
		response.InternalError(w, err.Error())
		return
	}
	h.audit.Record(r, "create", "product", created.ID.Hex(),
		"Created product "+created.Name, nil)
	response.Created(w, created)
}

func (h *AdminProductHandler) Update(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var p models.Product
	if err := validator.DecodeJSON(r, &p); err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	updated, err := h.svc.Update(r.Context(), id, p)
	if err != nil {
		response.InternalError(w, err.Error())
		return
	}
	h.audit.Record(r, "update", "product", id,
		"Updated product "+updated.Name, nil)
	response.OK(w, updated)
}

func (h *AdminProductHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if err := h.svc.Delete(r.Context(), id); err != nil {
		response.InternalError(w, err.Error())
		return
	}
	h.audit.Record(r, "delete", "product", id, "Deleted product", nil)
	response.NoContent(w)
}
