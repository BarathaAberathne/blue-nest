package export

import (
	"fmt"
	"net/http"

	"github.com/xuri/excelize/v2"
)

// WriteXLSX streams an .xlsx download with a bold header row + data rows.
func WriteXLSX(w http.ResponseWriter, filename string, headers []string, rows [][]string) {
	f := excelize.NewFile()
	defer func() { _ = f.Close() }()
	const sheet = "Sheet1"

	bold, _ := f.NewStyle(&excelize.Style{Font: &excelize.Font{Bold: true}})
	for i, h := range headers {
		cell, _ := excelize.CoordinatesToCellName(i+1, 1)
		_ = f.SetCellStr(sheet, cell, h)
		_ = f.SetCellStyle(sheet, cell, cell, bold)
	}
	for r, row := range rows {
		for c, val := range row {
			cell, _ := excelize.CoordinatesToCellName(c+1, r+2)
			_ = f.SetCellStr(sheet, cell, val)
		}
	}
	// A sensible default column width so names aren't clipped.
	if len(headers) > 0 {
		last, _ := excelize.ColumnNumberToName(len(headers))
		_ = f.SetColWidth(sheet, "A", last, 18)
	}

	w.Header().Set("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=%q", filename))
	w.Header().Set("Cache-Control", "no-store")
	_ = f.Write(w)
}

// Write dispatches an export to CSV (default) or XLSX based on the request's
// ?format= query param, so every list export supports both from one call site.
func Write(w http.ResponseWriter, r *http.Request, base string, headers []string, rows [][]string) {
	switch r.URL.Query().Get("format") {
	case "xlsx", "excel":
		WriteXLSX(w, base+"-"+dateStamp()+".xlsx", headers, rows)
	default:
		WriteCSV(w, Filename(base), headers, rows)
	}
}
