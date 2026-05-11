package email

import (
	"fmt"
	"log/slog"
	"net/smtp"
	"strings"
)

// LogoURL is the publicly accessible logo for use inside HTML email templates.
// Uses the GitHub raw CDN as an interim host until the site is deployed at
// https://bluenest.uk, at which point this should become:
//
//	https://bluenest.uk/email/logo.png
//
// The asset lives at frontend/public/email/logo.png (360×197 PNG, ~51 KB).
const LogoURL = "https://raw.githubusercontent.com/BarathaAberathne/blue-nest/main/frontend/public/email/logo.png"

type Config struct {
	Host    string
	Port    int
	User    string
	Pass    string
	From    string
	AdminTo string
}

type Mailer struct {
	cfg Config
}

func New(cfg Config) *Mailer {
	return &Mailer{cfg: cfg}
}

// Send sends an HTML email. Returns nil without error when SMTP is not configured
// (graceful no-op for local development).
func (m *Mailer) Send(to []string, subject, htmlBody string) error {
	if m.cfg.Host == "" {
		slog.Info("SMTP not configured — skipping email", "to", to, "subject", subject)
		return nil
	}

	addr := fmt.Sprintf("%s:%d", m.cfg.Host, m.cfg.Port)
	auth := smtp.PlainAuth("", m.cfg.User, m.cfg.Pass, m.cfg.Host)

	msg := buildMessage(m.cfg.From, to, subject, htmlBody)

	if err := smtp.SendMail(addr, auth, m.cfg.From, to, []byte(msg)); err != nil {
		return fmt.Errorf("smtp send: %w", err)
	}
	return nil
}

func buildMessage(from string, to []string, subject, htmlBody string) string {
	var b strings.Builder
	b.WriteString("From: Blue Nest Montessori <" + from + ">\r\n")
	b.WriteString("To: " + strings.Join(to, ", ") + "\r\n")
	b.WriteString("Subject: " + subject + "\r\n")
	b.WriteString("MIME-Version: 1.0\r\n")
	b.WriteString("Content-Type: text/html; charset=\"UTF-8\"\r\n")
	b.WriteString("\r\n")
	b.WriteString(htmlBody)
	return b.String()
}
