// Package export provides small helpers for server-side data exports (report
// downloads). CSV first: dependency-free, opens directly in Excel/Sheets.
package export

import (
	"encoding/csv"
	"fmt"
	"net/http"
	"strconv"
	"time"
)

// WriteCSV streams a CSV download: sets the text/csv content type and an
// attachment Content-Disposition with the given filename, writes a UTF-8 BOM
// (so Excel renders accented names correctly), then the header row and data
// rows. Any per-write error is logged by the caller's response, not surfaced
// mid-stream (the status line is already sent).
func WriteCSV(w http.ResponseWriter, filename string, headers []string, rows [][]string) {
	w.Header().Set("Content-Type", "text/csv; charset=utf-8")
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=%q", filename))
	w.Header().Set("Cache-Control", "no-store")
	// UTF-8 BOM for Excel.
	_, _ = w.Write([]byte{0xEF, 0xBB, 0xBF})

	cw := csv.NewWriter(w)
	_ = cw.Write(headers)
	for _, r := range rows {
		_ = cw.Write(r)
	}
	cw.Flush()
}

// dateStamp is today's date for export filenames (YYYY-MM-DD).
func dateStamp() string { return time.Now().Format("2006-01-02") }

// Filename builds a dated export filename, e.g. Filename("staff-attendance") ->
// "staff-attendance-2026-08-06.csv".
func Filename(base string) string {
	return fmt.Sprintf("%s-%s.csv", base, dateStamp())
}

// Int renders an int as a CSV cell.
func Int(n int) string { return strconv.Itoa(n) }

// Float renders a float with two decimals.
func Float(f float64) string { return strconv.FormatFloat(f, 'f', 2, 64) }
