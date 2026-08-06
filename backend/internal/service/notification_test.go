package service

import (
	"context"
	"strings"
	"testing"

	"github.com/blue-nest-montessori/api/internal/models"
)

func TestNotificationEmailHTML(t *testing.T) {
	n := models.Notification{
		Title: "New leave request",
		Body:  "Jane <b>Doe</b> requested leave", // contains HTML → must be escaped
		Link:  "/admin/leave",
	}
	out := notificationEmailHTML(n, "https://app.bluenest.uk/")

	if !strings.Contains(out, "Jane &lt;b&gt;Doe&lt;/b&gt; requested leave") {
		t.Error("body should be HTML-escaped in the email")
	}
	if strings.Contains(out, "<b>Doe</b>") {
		t.Error("raw HTML from the notification body must not appear unescaped")
	}
	if !strings.Contains(out, "https://app.bluenest.uk/admin/leave") {
		t.Error("relative link should be resolved to an absolute URL")
	}
	if !strings.Contains(out, "Blue Nest") {
		t.Error("email should be wrapped in the branded shell")
	}
}

// TestNotificationEmailDisabledIsSafe: with delivery disabled + no mailer/users,
// deliverEmails is a no-op and never panics (the in-app path is unaffected).
func TestNotificationEmailDisabledIsSafe(t *testing.T) {
	s := &notificationService{emailEnabled: false}
	s.deliverEmails(context.Background(), []string{"u1", ""}, models.Notification{Title: "x"})
}
