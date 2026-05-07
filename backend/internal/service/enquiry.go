package service

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"strings"

	"github.com/blue-nest-montessori/api/internal/models"
	"github.com/blue-nest-montessori/api/internal/platform/email"
	"github.com/blue-nest-montessori/api/internal/repository"
)

type EnquiryService interface {
	Submit(ctx context.Context, req models.EnquiryRequest) (*models.Enquiry, error)
	ListAll(ctx context.Context) ([]models.Enquiry, error)
	UpdateStatus(ctx context.Context, id, status string) error
}

type enquiryService struct {
	repo    repository.EnquiryRepository
	mailer  *email.Mailer
	adminTo string
}

func NewEnquiryService(repo repository.EnquiryRepository, mailer *email.Mailer, adminTo string) EnquiryService {
	return &enquiryService{repo: repo, mailer: mailer, adminTo: adminTo}
}

func (s *enquiryService) Submit(ctx context.Context, req models.EnquiryRequest) (*models.Enquiry, error) {
	if strings.TrimSpace(req.Name) == "" {
		return nil, errors.New("name is required")
	}
	if strings.TrimSpace(req.Email) == "" {
		return nil, errors.New("email is required")
	}
	if strings.TrimSpace(req.Branch) == "" {
		return nil, errors.New("branch is required")
	}
	if strings.TrimSpace(req.EnquiryType) == "" {
		return nil, errors.New("enquiry type is required")
	}
	if !req.Consent {
		return nil, errors.New("consent is required")
	}

	enquiry := &models.Enquiry{
		Name:        req.Name,
		Email:       req.Email,
		Phone:       req.Phone,
		Branch:      req.Branch,
		ChildAge:    req.ChildAge,
		EnquiryType: req.EnquiryType,
		Message:     req.Message,
		FeeQuote:    req.FeeQuote,
		Status:      "new",
	}

	if err := s.repo.Create(ctx, enquiry); err != nil {
		return nil, fmt.Errorf("save enquiry: %w", err)
	}

	// Send emails asynchronously so they don't delay the HTTP response.
	go func() {
		adminTo := s.adminTo
		if adminTo == "" {
			adminTo = "ba@bluenest.com"
		}
		if err := s.mailer.Send([]string{adminTo}, adminNotificationSubject(req), adminNotificationHTML(req)); err != nil {
			slog.Error("failed to send admin notification email", "error", err)
		}
		if err := s.mailer.Send([]string{req.Email}, userConfirmationSubject(), userConfirmationHTML(req)); err != nil {
			slog.Error("failed to send user confirmation email", "error", err)
		}
	}()

	return enquiry, nil
}

func (s *enquiryService) ListAll(ctx context.Context) ([]models.Enquiry, error) {
	return s.repo.FindAll(ctx)
}

func (s *enquiryService) UpdateStatus(ctx context.Context, id, status string) error {
	return s.repo.UpdateStatus(ctx, id, status)
}

// ── Email templates ───────────────────────────────────────────────────────────

func feeQuoteHTML(q *models.FeeQuote) string {
	if q == nil {
		return ""
	}
	fmtGBP := func(v float64) string { return fmt.Sprintf("£%.2f", v) }
	row := func(label, value string) string {
		if value == "" {
			return ""
		}
		return fmt.Sprintf(
			`<tr>`+
				`<td style="padding:6px 12px;font-weight:600;color:#3a5c38;background:#f2f7f2;width:160px;border-bottom:1px solid #d8e8d8;">%s</td>`+
				`<td style="padding:6px 12px;color:#2a3c29;border-bottom:1px solid #d8e8d8;">%s</td>`+
				`</tr>`,
			label, value,
		)
	}

	rows := row("Branch", q.Branch) +
		row("Age Group", q.AgeGroup) +
		row("Session", q.Session)
	if q.Days > 0 {
		rows += row("Days / Week", fmt.Sprintf("%d day(s)", q.Days))
	}
	if q.EarlyBird {
		rows += row("Early Bird", "Yes (before 8:00 am)")
	}
	if q.Funding != "" {
		rows += row("Gov. Funding", q.Funding+" hrs/wk")
	}
	rows += row("Gross Weekly", fmtGBP(q.GrossWeekly))
	if q.FundingOffset > 0 {
		rows += row("Funding Offset", "– "+fmtGBP(q.FundingOffset))
	}
	rows += row("Net Weekly", fmtGBP(q.NetWeekly))
	rows += row("Est. Monthly", fmtGBP(q.NetMonthly))

	return fmt.Sprintf(
		`<div style="margin-top:24px;">`+
			`<h2 style="margin:0 0 10px;font-size:13px;font-weight:700;color:#3a5c38;text-transform:uppercase;letter-spacing:0.08em;">Fee Quote</h2>`+
			`<table style="width:100%%;border-collapse:collapse;border-radius:8px;overflow:hidden;border:1px solid #d8e8d8;">%s</table>`+
			`</div>`,
		rows,
	)
}

func adminNotificationSubject(req models.EnquiryRequest) string {
	return fmt.Sprintf("New Enquiry: %s — %s", req.EnquiryType, req.Name)
}

func adminNotificationHTML(req models.EnquiryRequest) string {
	row := func(label, value string) string {
		if value == "" {
			return ""
		}
		return fmt.Sprintf(`<tr><td style="padding:6px 12px;font-weight:600;color:#5a4a42;background:#f8f1ec;width:140px;border-bottom:1px solid #f0e6df;">%s</td><td style="padding:6px 12px;color:#3a2e29;border-bottom:1px solid #f0e6df;">%s</td></tr>`, label, value)
	}

	return fmt.Sprintf(`<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#fdf8f5;font-family:Arial,sans-serif;">
  <div style="max-width:580px;margin:32px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(90,74,66,0.10);">
    <div style="background:#fde8f0;padding:24px 32px;border-bottom:3px solid #f4aac8;">
      <img src="https://bluenest.uk/home/logo_new.png" alt="Blue Nest Montessori" style="height:48px;" />
      <h1 style="margin:12px 0 0;font-size:20px;color:#3a2e29;">New Enquiry Received</h1>
    </div>
    <div style="padding:24px 32px;">
      <table style="width:100%%;border-collapse:collapse;border-radius:8px;overflow:hidden;border:1px solid #f0e6df;">
        %s%s%s%s%s%s%s
      </table>
      %s
      %s
    </div>
    <div style="background:#fdf8f5;padding:16px 32px;text-align:center;font-size:12px;color:rgba(90,74,66,0.55);">
      Blue Nest Montessori School &mdash; manager@bluenest.uk
    </div>
  </div>
</body>
</html>`,
		row("Name", req.Name),
		row("Email", req.Email),
		row("Phone", req.Phone),
		row("Branch", req.Branch),
		row("Child's Age", req.ChildAge),
		row("Enquiry Type", req.EnquiryType),
		row("Message", req.Message),
		func() string {
			if req.Message == "" {
				return ""
			}
			return fmt.Sprintf(`<p style="margin:20px 0 0;padding:16px;background:#f8f1ec;border-radius:8px;color:#3a2e29;font-size:14px;line-height:1.6;">%s</p>`, req.Message)
		}(),
		feeQuoteHTML(req.FeeQuote),
	)
}

func userConfirmationSubject() string {
	return "Thank you for your enquiry — Blue Nest Montessori"
}

func userConfirmationHTML(req models.EnquiryRequest) string {
	return fmt.Sprintf(`<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#fdf8f5;font-family:Arial,sans-serif;">
  <div style="max-width:580px;margin:32px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(90,74,66,0.10);">
    <div style="background:#fde8f0;padding:24px 32px;border-bottom:3px solid #f4aac8;">
      <img src="https://bluenest.uk/home/logo_new.png" alt="Blue Nest Montessori" style="height:48px;" />
    </div>
    <div style="padding:32px;">
      <h1 style="margin:0 0 8px;font-size:22px;color:#3a2e29;">Hi %s,</h1>
      <p style="margin:0 0 20px;font-size:15px;color:#5a4a42;line-height:1.7;">
        Thank you for getting in touch with <strong>Blue Nest Montessori School</strong>.
        We've received your enquiry about <strong>%s</strong> at our <strong>%s</strong> branch
        and a member of our team will get back to you within <strong>one working day</strong>.
      </p>
      <div style="background:#f8f1ec;border-radius:12px;padding:20px 24px;margin-bottom:24px;">
        <p style="margin:0 0 6px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:rgba(90,74,66,0.55);">Your enquiry summary</p>
        <p style="margin:0;font-size:14px;color:#3a2e29;"><strong>Type:</strong> %s</p>
        %s
      </div>
      <p style="margin:0 0 6px;font-size:14px;color:#5a4a42;">In the meantime, feel free to reach us directly:</p>
      <p style="margin:0;font-size:14px;color:#3a2e29;">
        📞 <a href="tel:02088615574" style="color:#3aada9;text-decoration:none;">020 8861 5574</a><br>
        ✉️ <a href="mailto:manager@bluenest.uk" style="color:#cf7d9c;text-decoration:none;">manager@bluenest.uk</a>
      </p>
    </div>
    <div style="background:#fdf8f5;padding:16px 32px;text-align:center;font-size:12px;color:rgba(90,74,66,0.55);">
      Blue Nest Montessori School &mdash; Harrow &bull; Pinner &bull; Borehamwood<br>
      Mon&ndash;Fri, 07:30&ndash;18:30
    </div>
  </div>
</body>
</html>`,
		req.Name,
		req.EnquiryType,
		req.Branch,
		req.EnquiryType,
		func() string {
			if req.Message == "" {
				return ""
			}
			return fmt.Sprintf(`<p style="margin:6px 0 0;font-size:14px;color:#3a2e29;"><strong>Message:</strong> %s</p>`, req.Message)
		}(),
	)
}
