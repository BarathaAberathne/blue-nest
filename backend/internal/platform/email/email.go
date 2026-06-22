package email

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"mime/multipart"
	"net/http"
	"net/smtp"
	"net/textproto"
	"strings"
	"time"
)

// Attachment is a file to attach to an email (e.g. a CSV order list).
type Attachment struct {
	Filename    string
	Content     []byte
	ContentType string // defaults to application/octet-stream
}

// LogoURL is the publicly accessible logo for use inside HTML email templates.
// Uses the GitHub raw CDN as an interim host until the site is deployed at
// https://bluenest.uk, at which point this should become:
//
//	https://bluenest.uk/email/logo.png
//
// The asset lives at frontend/public/email/logo.png (360×197 PNG, ~51 KB).
const LogoURL = "https://raw.githubusercontent.com/BarathaAberathne/blue-nest/main/frontend/public/email/logo.png"

// resendAPIURL is Resend's transactional email endpoint. Documented at
// https://resend.com/docs/api-reference/emails/send-email.
const resendAPIURL = "https://api.resend.com/emails"

type Config struct {
	Host         string
	Port         int
	User         string
	Pass         string
	From         string
	AdminTo      string
	ResendAPIKey string // optional; when set, sends via HTTPS instead of SMTP
}

type Mailer struct {
	cfg        Config
	httpClient *http.Client
}

func New(cfg Config) *Mailer {
	return &Mailer{
		cfg:        cfg,
		httpClient: &http.Client{Timeout: 15 * time.Second},
	}
}

// Send sends an HTML email. Picks the transport in this order:
//  1. Resend HTTPS API if RESEND_API_KEY is set (works behind networks that
//     block outbound SMTP — e.g. DigitalOcean droplets by default).
//  2. SMTP if a host is configured (local dev with Gmail / Mailpit / etc).
//  3. No-op log otherwise (graceful skip when nothing is configured).
func (m *Mailer) Send(to []string, subject, htmlBody string) error {
	return m.SendWithReplyTo(to, "", subject, htmlBody)
}

// SendWithReplyTo is Send with an optional Reply-To address — e.g. so a manager
// replying to an enquiry notification reaches the parent directly instead of the
// no-reply From. Pass "" to omit it.
func (m *Mailer) SendWithReplyTo(to []string, replyTo, subject, htmlBody string) error {
	if m.cfg.ResendAPIKey != "" {
		return m.sendViaResend(to, replyTo, subject, htmlBody)
	}
	if m.cfg.Host == "" {
		slog.Info("email not configured — skipping", "to", to, "subject", subject)
		return nil
	}

	addr := fmt.Sprintf("%s:%d", m.cfg.Host, m.cfg.Port)
	auth := smtp.PlainAuth("", m.cfg.User, m.cfg.Pass, m.cfg.Host)

	msg := buildMessage(m.cfg.From, to, replyTo, subject, htmlBody)

	if err := smtp.SendMail(addr, auth, m.cfg.From, to, []byte(msg)); err != nil {
		return fmt.Errorf("smtp send: %w", err)
	}
	return nil
}

// SendWithAttachments is Send plus file attachments (e.g. a CSV order list).
// Uses Resend when configured, else SMTP multipart, else logs a skip.
func (m *Mailer) SendWithAttachments(to []string, subject, htmlBody string, attachments []Attachment) error {
	if len(attachments) == 0 {
		return m.Send(to, subject, htmlBody)
	}
	if m.cfg.ResendAPIKey != "" {
		return m.sendViaResendWithAttachments(to, subject, htmlBody, attachments)
	}
	if m.cfg.Host == "" {
		slog.Info("email not configured — skipping", "to", to, "subject", subject, "attachments", len(attachments))
		return nil
	}
	addr := fmt.Sprintf("%s:%d", m.cfg.Host, m.cfg.Port)
	auth := smtp.PlainAuth("", m.cfg.User, m.cfg.Pass, m.cfg.Host)
	msg, err := buildMultipartMessage(m.cfg.From, to, subject, htmlBody, attachments)
	if err != nil {
		return err
	}
	if err := smtp.SendMail(addr, auth, m.cfg.From, to, msg); err != nil {
		return fmt.Errorf("smtp send: %w", err)
	}
	return nil
}

func (m *Mailer) sendViaResendWithAttachments(to []string, subject, htmlBody string, attachments []Attachment) error {
	atts := make([]map[string]any, 0, len(attachments))
	for _, a := range attachments {
		atts = append(atts, map[string]any{
			"filename": a.Filename,
			"content":  base64.StdEncoding.EncodeToString(a.Content),
		})
	}
	payload := map[string]any{
		"from":        fmt.Sprintf("Blue Nest Montessori <%s>", m.cfg.From),
		"to":          to,
		"subject":     subject,
		"html":        htmlBody,
		"attachments": atts,
	}
	body, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("resend marshal: %w", err)
	}
	req, err := http.NewRequest(http.MethodPost, resendAPIURL, bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("resend new request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+m.cfg.ResendAPIKey)
	req.Header.Set("Content-Type", "application/json")
	resp, err := m.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("resend post: %w", err)
	}
	defer resp.Body.Close()
	respBody, _ := io.ReadAll(resp.Body)
	if resp.StatusCode >= 300 {
		return fmt.Errorf("resend send: %d %s", resp.StatusCode, strings.TrimSpace(string(respBody)))
	}
	slog.Info("email sent via Resend", "to", to, "subject", subject, "attachments", len(attachments))
	return nil
}

// buildMultipartMessage assembles a MIME multipart/mixed message (HTML body +
// attachments) for the SMTP transport used in dev.
func buildMultipartMessage(from string, to []string, subject, htmlBody string, attachments []Attachment) ([]byte, error) {
	var buf bytes.Buffer
	writer := multipart.NewWriter(&buf)

	headers := bytes.Buffer{}
	headers.WriteString("From: Blue Nest Montessori <" + from + ">\r\n")
	headers.WriteString("To: " + strings.Join(to, ", ") + "\r\n")
	headers.WriteString("Subject: " + subject + "\r\n")
	headers.WriteString("MIME-Version: 1.0\r\n")
	headers.WriteString(fmt.Sprintf("Content-Type: multipart/mixed; boundary=%s\r\n\r\n", writer.Boundary()))

	// HTML part.
	htmlHeader := textproto.MIMEHeader{}
	htmlHeader.Set("Content-Type", "text/html; charset=\"UTF-8\"")
	part, err := writer.CreatePart(htmlHeader)
	if err != nil {
		return nil, err
	}
	if _, err := part.Write([]byte(htmlBody)); err != nil {
		return nil, err
	}

	// Attachment parts.
	for _, a := range attachments {
		ct := a.ContentType
		if ct == "" {
			ct = "application/octet-stream"
		}
		attHeader := textproto.MIMEHeader{}
		attHeader.Set("Content-Type", ct)
		attHeader.Set("Content-Transfer-Encoding", "base64")
		attHeader.Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, a.Filename))
		ap, err := writer.CreatePart(attHeader)
		if err != nil {
			return nil, err
		}
		encoded := base64.StdEncoding.EncodeToString(a.Content)
		// Wrap base64 at 76 chars per RFC 2045.
		for i := 0; i < len(encoded); i += 76 {
			end := i + 76
			if end > len(encoded) {
				end = len(encoded)
			}
			ap.Write([]byte(encoded[i:end] + "\r\n"))
		}
	}
	if err := writer.Close(); err != nil {
		return nil, err
	}
	return append(headers.Bytes(), buf.Bytes()...), nil
}

// sendViaResend posts a single email via Resend's REST API. The "from" field
// must be on a verified domain — typically configured via SMTP_FROM (e.g.
// noreply@blue-nest.com when blue-nest.com is the verified Resend domain).
func (m *Mailer) sendViaResend(to []string, replyTo, subject, htmlBody string) error {
	payload := map[string]any{
		"from":    fmt.Sprintf("Blue Nest Montessori <%s>", m.cfg.From),
		"to":      to,
		"subject": subject,
		"html":    htmlBody,
	}
	if replyTo != "" {
		payload["reply_to"] = replyTo
	}
	body, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("resend marshal: %w", err)
	}

	req, err := http.NewRequest(http.MethodPost, resendAPIURL, bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("resend new request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+m.cfg.ResendAPIKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := m.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("resend post: %w", err)
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)
	if resp.StatusCode >= 300 {
		return fmt.Errorf("resend send: %d %s", resp.StatusCode, strings.TrimSpace(string(respBody)))
	}
	slog.Info("email sent via Resend", "to", to, "subject", subject, "status", resp.StatusCode)
	return nil
}

// Recipients splits a comma-separated address list (e.g.
// SMTP_ADMIN_TO="a@x.com, b@y.com, c@z.com") into a clean slice — trimming
// whitespace and dropping empties. A single address yields a one-element slice.
// Used so admin notifications can fan out to several managers from one env var.
func Recipients(list string) []string {
	var out []string
	for _, p := range strings.Split(list, ",") {
		if a := strings.TrimSpace(p); a != "" {
			out = append(out, a)
		}
	}
	return out
}

func buildMessage(from string, to []string, replyTo, subject, htmlBody string) string {
	var b strings.Builder
	b.WriteString("From: Blue Nest Montessori <" + from + ">\r\n")
	b.WriteString("To: " + strings.Join(to, ", ") + "\r\n")
	if replyTo != "" {
		b.WriteString("Reply-To: " + replyTo + "\r\n")
	}
	b.WriteString("Subject: " + subject + "\r\n")
	b.WriteString("MIME-Version: 1.0\r\n")
	b.WriteString("Content-Type: text/html; charset=\"UTF-8\"\r\n")
	b.WriteString("\r\n")
	b.WriteString(htmlBody)
	return b.String()
}
