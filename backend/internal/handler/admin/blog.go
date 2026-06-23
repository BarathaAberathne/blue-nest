package admin

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/blue-nest-montessori/api/internal/models"
	"github.com/blue-nest-montessori/api/internal/service"
	"github.com/blue-nest-montessori/api/pkg/response"
	"github.com/blue-nest-montessori/api/pkg/validator"
	"github.com/go-chi/chi/v5"
)

type AdminBlogHandler struct {
	svc   service.BlogService
	audit service.AuditService
}

func NewAdminBlogHandler(svc service.BlogService, audit service.AuditService) *AdminBlogHandler {
	return &AdminBlogHandler{svc: svc, audit: audit}
}

func (h *AdminBlogHandler) List(w http.ResponseWriter, r *http.Request) {
	posts, err := h.svc.ListAll(r.Context())
	if err != nil {
		response.InternalError(w, err.Error())
		return
	}
	response.OK(w, posts)
}

func (h *AdminBlogHandler) Create(w http.ResponseWriter, r *http.Request) {
	var post models.BlogPost
	if err := validator.DecodeJSON(r, &post); err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	created, err := h.svc.Create(r.Context(), post)
	if err != nil {
		response.InternalError(w, err.Error())
		return
	}
	h.audit.Record(r, "create", "blog_post", created.ID.Hex(),
		"Created blog post "+created.Title, nil)
	response.Created(w, created)
}

func (h *AdminBlogHandler) Update(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var post models.BlogPost
	if err := validator.DecodeJSON(r, &post); err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	updated, err := h.svc.Update(r.Context(), id, post)
	if err != nil {
		response.InternalError(w, err.Error())
		return
	}
	h.audit.Record(r, "update", "blog_post", id,
		"Updated blog post "+updated.Title, nil)
	response.OK(w, updated)
}

func (h *AdminBlogHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if err := h.svc.Delete(r.Context(), id); err != nil {
		response.InternalError(w, err.Error())
		return
	}
	h.audit.Record(r, "delete", "blog_post", id, "Deleted blog post", nil)
	response.NoContent(w)
}

func (h *AdminBlogHandler) TriggerPublishScheduled(w http.ResponseWriter, r *http.Request) {
	n, err := h.svc.PublishScheduled(r.Context())
	if err != nil {
		response.InternalError(w, err.Error())
		return
	}
	response.OK(w, map[string]int{"published": n})
}

func (h *AdminBlogHandler) UploadImage(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseMultipartForm(10 << 20); err != nil {
		response.BadRequest(w, "file too large or invalid form")
		return
	}
	file, header, err := r.FormFile("image")
	if err != nil {
		response.BadRequest(w, "image field required")
		return
	}
	defer file.Close()

	ext := strings.ToLower(filepath.Ext(header.Filename))
	allowed := map[string]bool{".jpg": true, ".jpeg": true, ".png": true, ".webp": true, ".gif": true}
	if !allowed[ext] {
		response.BadRequest(w, "unsupported type: use jpg, png, webp, or gif")
		return
	}

	filename := fmt.Sprintf("%d%s", time.Now().UnixNano(), ext)
	dst, err := os.Create(filepath.Join("uploads", filename))
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
	imageURL := fmt.Sprintf("%s://%s/uploads/%s", scheme, host, filename)
	response.OK(w, map[string]string{"url": imageURL})
}
