package middleware

import (
	"net/http"

	"github.com/go-chi/cors"
)

func CORS(allowedOrigins []string) func(http.Handler) http.Handler {
	return cors.Handler(cors.Options{
		AllowedOrigins:   allowedOrigins,
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-Kiosk-Token"},
		// Content-Disposition must be EXPOSED for cross-origin downloads: the
		// frontend reads the server's attachment filename from it (PDF/CSV/XLSX
		// exports). Without this the browser hides the header and every export
		// fell back to the generic "export.csv" name — a profile PDF literally
		// downloaded as a .csv.
		ExposedHeaders:   []string{"Link", "Content-Disposition"},
		AllowCredentials: true,
		MaxAge:           300,
	})
}
