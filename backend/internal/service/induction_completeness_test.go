package service

import "testing"

// TestHasAnsweredValue locks the SaveSection backstop: complete=true is only
// accepted when the section carries at least one real answer, so an untouched
// section can never be marked complete (whatever the client sends).
func TestHasAnsweredValue(t *testing.T) {
	cases := []struct {
		name string
		data map[string]any
		want bool
	}{
		{"nil map", nil, false},
		{"empty map", map[string]any{}, false},
		{"blank strings only", map[string]any{"a": "", "b": "   "}, false},
		{"false bool only", map[string]any{"confirmed": false}, false},
		{"empty list only", map[string]any{"allergy_tags": []any{}}, false},
		{"nil value only", map[string]any{"a": nil}, false},
		{"real string", map[string]any{"address": "45 QA Lane"}, true},
		{"true bool", map[string]any{"confirmed_nothing_to_record": true}, true},
		{"non-empty list", map[string]any{"allergy_tags": []any{"nuts"}}, true},
		{"number", map[string]any{"count": 2}, true},
		{"one real among blanks", map[string]any{"a": "", "b": "yes"}, true},
	}
	for _, c := range cases {
		if got := hasAnsweredValue(c.data); got != c.want {
			t.Errorf("%s: hasAnsweredValue = %v, want %v", c.name, got, c.want)
		}
	}
}
