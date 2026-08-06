package service

import (
	"context"
	"html"
	"strings"

	"github.com/blue-nest-montessori/api/internal/models"
	"github.com/blue-nest-montessori/api/internal/platform/email"
	"github.com/blue-nest-montessori/api/internal/repository"
)

// EmailTemplateResolved is a catalogue entry plus its current effective copy
// (the org's custom values when set, otherwise the built-in defaults).
type EmailTemplateResolved struct {
	models.EmailTemplateInfo
	Customized bool   `json:"customized"`
	Subject    string `json:"subject"`
	Body       string `json:"body"`
}

// EmailTemplateService serves + edits per-org transactional email copy and
// renders a template (custom copy only) into a branded HTML email.
type EmailTemplateService interface {
	List(ctx context.Context) ([]EmailTemplateResolved, error)
	Upsert(ctx context.Context, key string, req models.EmailTemplateRequest) (*models.EmailTemplate, error)
	Delete(ctx context.Context, key string) error
	// Render substitutes vars into the org's CUSTOM template for key and wraps it
	// in the branded shell. Returns ok=false when no custom template exists (the
	// caller then uses its built-in default), so behaviour is unchanged until an
	// admin customises the copy.
	Render(ctx context.Context, key string, vars map[string]string) (subject, htmlBody string, ok bool)
}

type emailTemplateService struct {
	repo repository.EmailTemplateRepository
}

func NewEmailTemplateService(repo repository.EmailTemplateRepository) EmailTemplateService {
	return &emailTemplateService{repo: repo}
}

func (s *emailTemplateService) List(ctx context.Context) ([]EmailTemplateResolved, error) {
	stored, err := s.repo.FindAll(ctx)
	if err != nil {
		return nil, err
	}
	byKey := map[string]models.EmailTemplate{}
	for _, t := range stored {
		byKey[t.Key] = t
	}
	out := make([]EmailTemplateResolved, 0, len(models.EmailTemplateCatalogue))
	for _, info := range models.EmailTemplateCatalogue {
		r := EmailTemplateResolved{EmailTemplateInfo: info, Subject: info.DefaultSubject, Body: info.DefaultBody}
		if t, ok := byKey[info.Key]; ok {
			r.Customized = true
			r.Subject = t.Subject
			r.Body = t.Body
		}
		out = append(out, r)
	}
	return out, nil
}

func (s *emailTemplateService) Upsert(ctx context.Context, key string, req models.EmailTemplateRequest) (*models.EmailTemplate, error) {
	if models.EmailTemplateInfoFor(key) == nil {
		return nil, errUnknownEmailTemplate
	}
	return s.repo.Upsert(ctx, key, strings.TrimSpace(req.Subject), req.Body)
}

func (s *emailTemplateService) Delete(ctx context.Context, key string) error {
	return s.repo.Delete(ctx, key)
}

func (s *emailTemplateService) Render(ctx context.Context, key string, vars map[string]string) (string, string, bool) {
	t, err := s.repo.FindByKey(ctx, key)
	if err != nil || t == nil {
		return "", "", false
	}
	subject := substitutePlaceholders(t.Subject, vars, false)
	body := substitutePlaceholders(t.Body, vars, true)
	return subject, wrapEmailShell(body), true
}

var errUnknownEmailTemplate = &emailTemplateError{"unknown email template key"}

type emailTemplateError struct{ msg string }

func (e *emailTemplateError) Error() string { return e.msg }

// substitutePlaceholders replaces {{name}} tokens. When htmlEscape is true the
// substituted VALUES are HTML-escaped (bodies render as HTML), guarding against
// injection from user-supplied fields like an enquiry message.
func substitutePlaceholders(s string, vars map[string]string, htmlEscape bool) string {
	for k, v := range vars {
		val := v
		if htmlEscape {
			val = html.EscapeString(v)
		}
		s = strings.ReplaceAll(s, "{{"+k+"}}", val)
	}
	return s
}

// wrapEmailShell renders a message body (plain text / light HTML, newline-
// separated paragraphs) inside the branded Blue Nest email shell.
func wrapEmailShell(body string) string {
	var b strings.Builder
	for _, para := range strings.Split(strings.TrimSpace(body), "\n\n") {
		para = strings.ReplaceAll(strings.TrimSpace(para), "\n", "<br>")
		if para == "" {
			continue
		}
		b.WriteString(`<p style="margin:0 0 16px;font-size:15px;color:#5a4a42;line-height:1.7;">` + para + `</p>`)
	}
	return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>` +
		`<body style="margin:0;padding:0;background:#fdf8f5;font-family:Arial,sans-serif;">` +
		`<div style="max-width:580px;margin:32px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(90,74,66,0.10);">` +
		`<div style="background:#fde8f0;padding:24px 32px;border-bottom:3px solid #f4aac8;text-align:center;">` +
		`<img src="` + email.LogoURL + `" alt="Blue Nest Montessori School" width="240" style="display:block;height:auto;border:0;max-width:240px;margin:0 auto;" /></div>` +
		`<div style="padding:32px;">` + b.String() + `</div>` +
		`<div style="background:#fdf8f5;padding:16px 32px;text-align:center;font-size:12px;color:rgba(90,74,66,0.55);">` +
		`Blue Nest Montessori School</div></div></body></html>`
}
