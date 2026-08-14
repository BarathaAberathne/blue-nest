package service

import (
	"bytes"
	"context"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"github.com/blue-nest-montessori/api/internal/models"
	"github.com/go-pdf/fpdf"
)

// ChildProfilePDFService composes the FULL child profile — identity, family &
// contacts, every induction answer, consents, and (permission-gated) the SEND
// profile — into a downloadable A4 PDF. First server-side PDF export (the
// Phase-E "PDF" item); the same assembly the tabbed profile page shows.
type ChildProfilePDFService interface {
	// Build returns the rendered PDF + a dated filename. includeSend gates the
	// sensitive SEND section on the CALLER's send.manage permission — the
	// document must never carry data the requester couldn't see on screen.
	Build(ctx context.Context, childID string, includeSend bool) (pdf []byte, filename string, err error)
}

type childProfilePDFService struct {
	children  ChildService
	parents   ParentService
	induction InductionService
	send      SendSupportService
}

func NewChildProfilePDFService(children ChildService, parents ParentService, induction InductionService, send SendSupportService) ChildProfilePDFService {
	return &childProfilePDFService{children: children, parents: parents, induction: induction, send: send}
}

// pdfWriter wraps fpdf with the small layout vocabulary the profile needs.
type pdfWriter struct {
	pdf *fpdf.Fpdf
	tr  func(string) string
}

const (
	pdfInk    = 30  // near-black
	pdfMuted  = 120 // slate label
	pdfLineY  = 5.2
	pdfLabelW = 52.0
	pdfPageW  = 180.0 // A4 width minus 15mm margins
)

func (w *pdfWriter) section(title string) {
	w.pdf.Ln(3)
	w.pdf.SetFont("Helvetica", "B", 11.5)
	w.pdf.SetTextColor(13, 100, 92) // brand teal, dark enough for print
	w.pdf.CellFormat(pdfPageW, 7, w.tr(strings.ToUpper(title)), "", 1, "L", false, 0, "")
	w.pdf.SetDrawColor(210, 214, 220)
	w.pdf.Line(15, w.pdf.GetY(), 15+pdfPageW, w.pdf.GetY())
	w.pdf.Ln(1.5)
	w.pdf.SetTextColor(pdfInk, pdfInk, pdfInk)
}

func (w *pdfWriter) kv(label, value string) {
	if strings.TrimSpace(value) == "" {
		value = "—"
	}
	w.pdf.SetFont("Helvetica", "", 9)
	w.pdf.SetTextColor(pdfMuted, pdfMuted, pdfMuted)
	y := w.pdf.GetY()
	w.pdf.MultiCell(pdfLabelW, pdfLineY, w.tr(label), "", "L", false)
	afterLabel := w.pdf.GetY()
	w.pdf.SetXY(15+pdfLabelW, y)
	w.pdf.SetTextColor(pdfInk, pdfInk, pdfInk)
	w.pdf.MultiCell(pdfPageW-pdfLabelW, pdfLineY, w.tr(value), "", "L", false)
	if w.pdf.GetY() < afterLabel {
		w.pdf.SetY(afterLabel)
	}
	w.pdf.SetX(15)
}

func (w *pdfWriter) sub(title string) {
	w.pdf.Ln(1)
	w.pdf.SetFont("Helvetica", "B", 9.5)
	w.pdf.SetTextColor(pdfInk, pdfInk, pdfInk)
	w.pdf.CellFormat(pdfPageW, 6, w.tr(title), "", 1, "L", false, 0, "")
}

// answerText renders one stored induction answer (the same conventions as the
// profile UI: booleans and the wizard's "yes"/"no" strings become Yes/No).
func answerText(v any) string {
	switch t := v.(type) {
	case nil:
		return ""
	case bool:
		if t {
			return "Yes"
		}
		return "No"
	case []any:
		parts := make([]string, 0, len(t))
		for _, p := range t {
			parts = append(parts, fmt.Sprint(p))
		}
		return strings.Join(parts, ", ")
	case string:
		switch strings.ToLower(strings.TrimSpace(t)) {
		case "yes":
			return "Yes"
		case "no":
			return "No"
		}
		return t
	default:
		return fmt.Sprint(t)
	}
}

// humanKey turns a stored field key into a readable label ("gp_name" → "Gp name").
// The induction data is schemaless server-side, so keys are rendered
// data-driven rather than through a second (drift-prone) field catalogue.
func humanKey(k string) string {
	s := strings.ReplaceAll(k, "_", " ")
	if s == "" {
		return s
	}
	return strings.ToUpper(s[:1]) + s[1:]
}

func ageOn(dob string, now time.Time) string {
	d, err := time.Parse("2006-01-02", dob)
	if err != nil {
		return ""
	}
	months := (now.Year()-d.Year())*12 + int(now.Month()) - int(d.Month())
	if now.Day() < d.Day() {
		months--
	}
	if months < 0 {
		return ""
	}
	return fmt.Sprintf("%dy %dm", months/12, months%12)
}

func relFlags(r models.ChildParentRelationship) string {
	var f []string
	if r.ParentalResponsibility {
		f = append(f, "parental responsibility")
	}
	if r.PrimaryContact {
		f = append(f, "primary contact")
	}
	if r.EmergencyContact {
		f = append(f, "emergency contact")
	}
	if r.AuthorisedCollection {
		f = append(f, "authorised to collect")
	}
	if r.BillingContact {
		f = append(f, "billing contact")
	}
	if r.LivesWithChild {
		f = append(f, "lives with child")
	}
	if r.LegalContact {
		f = append(f, "legal contact")
	}
	return strings.Join(f, " · ")
}

func (s *childProfilePDFService) Build(ctx context.Context, childID string, includeSend bool) ([]byte, string, error) {
	child, err := s.children.GetByID(ctx, childID)
	if err != nil {
		return nil, "", err
	}
	rels, _ := s.parents.ForChild(ctx, childID)
	ind, _ := s.induction.Get(ctx, childID)
	consents, _ := s.induction.Consents(ctx, childID)
	var send *models.ChildSendSupport
	if includeSend && s.send != nil {
		send, _ = s.send.Get(ctx, childID)
	}

	pdf := fpdf.New("P", "mm", "A4", "")
	pdf.SetMargins(15, 15, 15)
	pdf.SetAutoPageBreak(true, 18)
	pdf.SetTitle("Child profile — "+child.FirstName+" "+child.LastName, true)
	w := &pdfWriter{pdf: pdf, tr: pdf.UnicodeTranslatorFromDescriptor("")}
	pdf.SetFooterFunc(func() {
		pdf.SetY(-12)
		pdf.SetFont("Helvetica", "", 7.5)
		pdf.SetTextColor(pdfMuted, pdfMuted, pdfMuted)
		pdf.CellFormat(pdfPageW, 5, w.tr(fmt.Sprintf("Confidential — child record %s · generated %s · page %d",
			child.Ref, time.Now().Format("2 Jan 2006 15:04"), pdf.PageNo())), "", 0, "C", false, 0, "")
	})
	pdf.AddPage()

	// ── Header (profile photo top-right when the child has one) ──────────────
	titleW := pdfPageW
	if photo := localUploadPath(child.PhotoURL); photo != "" {
		pdf.ImageOptions(photo, 15+pdfPageW-26, 15, 26, 0, false, fpdf.ImageOptions{ReadDpi: true}, 0, "")
		if !pdf.Ok() {
			// A corrupt/unsupported image must never kill the document —
			// fpdf errors are sticky, so clear it and render without the photo.
			pdf.ClearError()
		} else {
			titleW = pdfPageW - 30
		}
	}
	pdf.SetFont("Helvetica", "B", 18)
	pdf.SetTextColor(pdfInk, pdfInk, pdfInk)
	pdf.CellFormat(titleW, 9, w.tr(strings.TrimSpace(child.FirstName+" "+child.LastName)), "", 1, "L", false, 0, "")
	pdf.SetFont("Helvetica", "", 9.5)
	pdf.SetTextColor(pdfMuted, pdfMuted, pdfMuted)
	meta := []string{child.Ref, "Full child profile"}
	pdf.CellFormat(titleW, 5.5, w.tr(strings.Join(meta, " · ")), "", 1, "L", false, 0, "")
	pdf.Ln(1)

	// ── Profile ──────────────────────────────────────────────────────────────
	w.section("Profile")
	w.kv("Date of birth", child.DOB+ifStr(ageOn(child.DOB, time.Now()) != "", "  ("+ageOn(child.DOB, time.Now())+")", ""))
	w.kv("Gender", child.Gender)
	w.kv("Status", string(child.Status))
	w.kv("Branch", child.BranchSlug)
	w.kv("Room", child.RoomName)
	w.kv("Key person", child.KeyPersonName)
	w.kv("Start date", child.StartDate)
	w.kv("Funding", child.FundingType)
	w.kv("Home address", child.Address)
	if len(child.Sessions) > 0 {
		var days []string
		for _, sess := range child.Sessions {
			days = append(days, sess.Day+" "+sess.Type)
		}
		w.kv("Weekly sessions", strings.Join(days, " · "))
	}

	// ── Allergies, dietary & medical ─────────────────────────────────────────
	w.section("Allergies, dietary & medical")
	w.kv("Allergies", strings.TrimSpace(strings.Join(child.AllergyTags, ", ")+ifStr(child.Allergies != "", " — "+child.Allergies, "")))
	w.kv("Dietary", strings.TrimSpace(strings.Join(child.DietaryTags, ", ")+ifStr(child.DietaryReqs != "", " — "+child.DietaryReqs, "")))
	w.kv("Medical notes", child.MedicalNotes)

	// ── Parents, guardians & contacts ────────────────────────────────────────
	w.section("Parents, guardians & contacts")
	if len(rels) == 0 {
		w.kv("Contacts", "None recorded")
	}
	for _, r := range rels {
		name := r.ParentName
		var contact []string
		if p, err := s.parents.GetByID(ctx, r.ParentID); err == nil && p != nil {
			name = strings.TrimSpace(p.FirstName + " " + p.LastName)
			for _, c := range []string{p.MobilePhone, p.HomePhone, p.Email} {
				if c != "" {
					contact = append(contact, c)
				}
			}
		}
		w.sub(name + ifStr(r.Relationship != "", " — "+r.Relationship, ""))
		w.kv("Contact", strings.Join(contact, " · "))
		w.kv("Roles", relFlags(r))
		if r.ContactArrangements != "" {
			w.kv("Contact arrangements", r.ContactArrangements)
		}
	}

	// ── Induction (every answered section, in catalogue order) ───────────────
	w.section("Induction form")
	if ind == nil {
		w.kv("Status", "Not started")
	} else {
		status := string(ind.Status)
		if ind.Status == models.InductionReviewed && ind.ReviewedAt != nil {
			status += " — signed off " + ind.ReviewedAt.Format("2 Jan 2006")
		} else if ind.SubmittedAt != nil {
			status += " — submitted " + ind.SubmittedAt.Format("2 Jan 2006")
		}
		w.kv("Status", status)
		if ind.ReviewNote != "" {
			w.kv("Review note", ind.ReviewNote)
		}
		for _, def := range models.InductionSections {
			sec, ok := ind.Sections[def.Key]
			if !ok {
				continue
			}
			w.sub(def.Label + ifStr(!sec.Complete, " (in progress)", ""))
			if len(sec.Data) == 0 {
				w.kv("Answers", "Marked complete — no details recorded")
				continue
			}
			keys := make([]string, 0, len(sec.Data))
			for k := range sec.Data {
				keys = append(keys, k)
			}
			sort.Strings(keys)
			for _, k := range keys {
				w.kv(humanKey(k), answerText(sec.Data[k]))
			}
		}
	}

	// ── Consents (latest decision per catalogue item) ────────────────────────
	w.section("Consents")
	latest := LatestConsents(consents)
	for _, def := range models.ConsentCatalogue {
		c, ok := latest[def.Key]
		if !ok {
			w.kv(def.Label, "Not recorded")
			continue
		}
		v := "Withdrawn"
		if c.Granted {
			v = "Granted"
		}
		v += " — " + c.SignatureName + ", " + c.CreatedAt.Format("2 Jan 2006")
		if c.Note != "" {
			v += " (" + c.Note + ")"
		}
		w.kv(def.Label, v)
	}

	// ── SEND / additional support (send.manage callers only) ─────────────────
	if send != nil {
		w.section("Additional support / SEND")
		w.kv("Status", string(send.Status))
		w.kv("Plan", string(send.PlanStatus))
		w.kv("Categories", strings.Join(send.Categories, ", "))
		w.kv("Support required", send.Summary)
		w.kv("Review date", send.ReviewDate)
	}

	var buf bytes.Buffer
	if err := pdf.Output(&buf); err != nil {
		return nil, "", err
	}
	ref := child.Ref
	if ref == "" {
		ref = child.ID.Hex()
	}
	return buf.Bytes(), fmt.Sprintf("child-profile-%s-%s.pdf", ref, time.Now().Format("2006-01-02")), nil
}

func ifStr(cond bool, a, b string) string {
	if cond {
		return a
	}
	return b
}

// localUploadPath maps a stored photo URL onto the API's own uploads
// directory. Only our uploads resolve (the photo validator already rejects
// hotlinks); basename-only so a crafted URL can never traverse the
// filesystem, and only image types fpdf can embed are accepted.
func localUploadPath(photoURL string) string {
	if photoURL == "" {
		return ""
	}
	idx := strings.LastIndex(photoURL, "/uploads/")
	if idx < 0 {
		return ""
	}
	name := filepath.Base(photoURL[idx+len("/uploads/"):])
	switch strings.ToLower(filepath.Ext(name)) {
	case ".jpg", ".jpeg", ".png", ".gif":
	default:
		return ""
	}
	p := filepath.Join("uploads", name)
	if _, err := os.Stat(p); err != nil {
		return ""
	}
	return p
}
