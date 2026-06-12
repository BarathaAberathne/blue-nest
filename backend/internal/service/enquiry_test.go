package service

import "testing"

func TestFormatBranch(t *testing.T) {
	cases := map[string]string{
		"harrow":       "Harrow",
		"borehamwood":  "Borehamwood",
		"pinner":       "Pinner",
		"pinner-green": "Pinner Green",
		"pinner green": "Pinner Green",
		"HARROW":       "Harrow",
		"Harrow":       "Harrow",
		"northwood":    "Northwood",
		"":             "",
	}
	for in, want := range cases {
		if got := formatBranch(in); got != want {
			t.Errorf("formatBranch(%q) = %q, want %q", in, got, want)
		}
	}
}
