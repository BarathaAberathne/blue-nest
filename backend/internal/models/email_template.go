package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Email templates - per-org, editable subject + body for transactional emails.
// A template is OPT-IN: when an org has none for a given key, the system uses the
// built-in default copy, so existing emails are unchanged until an admin
// customises them. The editable body is the message text (with {{placeholders}});
// the system wraps it in the branded HTML shell, so admins never edit raw layout.

// Known template keys. Add a key here + to EmailTemplateCatalogue + wire the
// send site to introduce a new customisable email.
const (
	EmailTplEnquiryAck = "enquiry_acknowledgement" // parent's "thanks for your enquiry" email
)

// EmailTemplate is one org's customised copy for a template key.
type EmailTemplate struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"id,omitempty"`
	OrgID     string             `bson:"org_id,omitempty" json:"org_id,omitempty"`
	Key       string             `bson:"key"     json:"key"`
	Subject   string             `bson:"subject" json:"subject"`
	Body      string             `bson:"body"    json:"body"` // message HTML/text with {{placeholders}}
	UpdatedAt time.Time          `bson:"updated_at" json:"updated_at,omitempty"`
}

// EmailTemplateRequest is the admin upsert payload.
type EmailTemplateRequest struct {
	Subject string `json:"subject"`
	Body    string `json:"body"`
}

// EmailTemplateInfo describes an available template (for the admin catalogue).
type EmailTemplateInfo struct {
	Key         string   `json:"key"`
	Label       string   `json:"label"`
	Description string   `json:"description"`
	Variables   []string `json:"variables"` // placeholder names usable as {{name}}
	// Defaults shown as the starting point when no custom template exists.
	DefaultSubject string `json:"default_subject"`
	DefaultBody    string `json:"default_body"`
}

// EmailTemplateCatalogue is the set of customisable transactional emails.
var EmailTemplateCatalogue = []EmailTemplateInfo{
	{
		Key:         EmailTplEnquiryAck,
		Label:       "Enquiry acknowledgement",
		Description: "Sent to a parent immediately after they submit the contact/enquiry form.",
		Variables:   []string{"name", "branch", "type", "message"},
		DefaultSubject: "Thank you for your enquiry - Blue Nest Montessori",
		DefaultBody: "Hi {{name}},\n\n" +
			"Thank you for getting in touch with Blue Nest Montessori School. We've received your enquiry about " +
			"{{type}} at our {{branch}} branch and a member of our team will get back to you within one working day.\n\n" +
			"In the meantime, feel free to reach us on 020 8861 5574 or manager@bluenest.uk.",
	},
}

// EmailTemplateInfoFor returns the catalogue entry for a key (nil if unknown).
func EmailTemplateInfoFor(key string) *EmailTemplateInfo {
	for i := range EmailTemplateCatalogue {
		if EmailTemplateCatalogue[i].Key == key {
			return &EmailTemplateCatalogue[i]
		}
	}
	return nil
}
