package email

import (
	"strings"
	"testing"
)

func TestRecipients(t *testing.T) {
	cases := []struct {
		name string
		in   string
		want []string
	}{
		{"single", "a@x.com", []string{"a@x.com"}},
		{"multiple", "a@x.com,b@y.com,c@z.com", []string{"a@x.com", "b@y.com", "c@z.com"}},
		{"whitespace and trailing comma", " a@x.com , b@y.com ,", []string{"a@x.com", "b@y.com"}},
		{"empty", "", nil},
		{"only commas", " , , ", nil},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			got := Recipients(c.in)
			if len(got) != len(c.want) {
				t.Fatalf("Recipients(%q) = %v, want %v", c.in, got, c.want)
			}
			for i := range got {
				if got[i] != c.want[i] {
					t.Errorf("Recipients(%q)[%d] = %q, want %q", c.in, i, got[i], c.want[i])
				}
			}
		})
	}
}

func TestBuildMessageReplyTo(t *testing.T) {
	with := buildMessage("info@bluenest.uk", []string{"m@bluenest.uk"}, "parent@example.com", "Subj", "<p>hi</p>")
	if !strings.Contains(with, "Reply-To: parent@example.com\r\n") {
		t.Errorf("expected Reply-To header, got:\n%s", with)
	}

	without := buildMessage("info@bluenest.uk", []string{"m@bluenest.uk"}, "", "Subj", "<p>hi</p>")
	if strings.Contains(without, "Reply-To:") {
		t.Errorf("did not expect Reply-To header when empty, got:\n%s", without)
	}
}
