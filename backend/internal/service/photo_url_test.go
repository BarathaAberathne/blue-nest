package service

import "testing"

func TestValidPhotoURL(t *testing.T) {
	valid := []string{
		"/uploads/123.jpg",
		"http://localhost:8080/uploads/17123.png",
		"https://api.blue-nest.com/uploads/17123.webp",
	}
	for _, u := range valid {
		if !validPhotoURL(u) {
			t.Errorf("expected valid: %s", u)
		}
	}
	invalid := []string{
		"https://evil.example.com/pic.jpg", // external hotlink, not an upload
		"javascript:alert(1)",              // scheme injection
		"uploads/123.jpg",                  // relative without leading slash
		"ftp://host/uploads/x.jpg",         // wrong scheme
	}
	for _, u := range invalid {
		if validPhotoURL(u) {
			t.Errorf("expected invalid: %s", u)
		}
	}
}
