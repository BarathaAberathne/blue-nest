package service

import (
	"bytes"
	"context"
	"encoding/csv"
	"errors"
	"fmt"
	"html"
	"io"
	"regexp"
	"strconv"
	"strings"

	"github.com/blue-nest-montessori/api/internal/models"
	"github.com/blue-nest-montessori/api/internal/repository"
)

var htmlTagRE = regexp.MustCompile("<[^>]*>")
var slugUnsafeRE = regexp.MustCompile("[^a-z0-9]+")

type ProductImportSummary struct {
	Imported int      `json:"imported"`
	Skipped  int      `json:"skipped"`
	Failed   int      `json:"failed"`
	Errors   []string `json:"errors,omitempty"`
}

type ProductService interface {
	List(ctx context.Context) ([]models.Product, error)
	ListAdmin(ctx context.Context) ([]models.Product, error)
	GetByID(ctx context.Context, id string) (*models.Product, error)
	ListCategories(ctx context.Context) ([]models.Category, error)
	CreateCategory(ctx context.Context, c models.Category) (*models.Category, error)
	UpdateCategory(ctx context.Context, id string, c models.Category) (*models.Category, error)
	DeleteCategory(ctx context.Context, id string) error
	Create(ctx context.Context, p models.Product) (*models.Product, error)
	Update(ctx context.Context, id string, p models.Product) (*models.Product, error)
	Delete(ctx context.Context, id string) error
	ImportCSV(ctx context.Context, body []byte) (*ProductImportSummary, error)
}

type productService struct {
	repo repository.ProductRepository
}

func NewProductService(repo repository.ProductRepository) ProductService {
	return &productService{repo: repo}
}

func (s *productService) List(ctx context.Context) ([]models.Product, error) {
	return s.repo.FindAll(ctx)
}

func (s *productService) ListAdmin(ctx context.Context) ([]models.Product, error) {
	return s.repo.FindAllAdmin(ctx)
}

func (s *productService) GetByID(ctx context.Context, id string) (*models.Product, error) {
	return s.repo.FindByID(ctx, id)
}

func (s *productService) ListCategories(ctx context.Context) ([]models.Category, error) {
	return s.repo.FindAllCategories(ctx)
}

func (s *productService) CreateCategory(ctx context.Context, c models.Category) (*models.Category, error) {
	return s.repo.CreateCategory(ctx, c)
}

func (s *productService) UpdateCategory(ctx context.Context, id string, c models.Category) (*models.Category, error) {
	return s.repo.UpdateCategory(ctx, id, c)
}

func (s *productService) DeleteCategory(ctx context.Context, id string) error {
	return s.repo.DeleteCategory(ctx, id)
}

func (s *productService) Create(ctx context.Context, p models.Product) (*models.Product, error) {
	return s.repo.Create(ctx, p)
}

func (s *productService) Update(ctx context.Context, id string, p models.Product) (*models.Product, error) {
	return s.repo.Update(ctx, id, p)
}

func (s *productService) Delete(ctx context.Context, id string) error {
	return s.repo.Delete(ctx, id)
}

func (s *productService) ImportCSV(ctx context.Context, body []byte) (*ProductImportSummary, error) {
	body = bytes.TrimPrefix(body, []byte("\xef\xbb\xbf"))
	reader := csv.NewReader(bytes.NewReader(body))
	reader.FieldsPerRecord = -1

	rows, err := reader.ReadAll()
	if err != nil {
		return nil, fmt.Errorf("parse csv: %w", err)
	}
	if len(rows) < 2 {
		return nil, errors.New("csv has no data rows")
	}

	headers := map[string]int{}
	for i, col := range rows[0] {
		headers[strings.TrimSpace(strings.ToLower(col))] = i
	}

	required := []string{"handleid", "fieldtype", "name", "price"}
	for _, key := range required {
		if _, ok := headers[key]; !ok {
			return nil, fmt.Errorf("csv missing required column: %s", key)
		}
	}

	summary := &ProductImportSummary{Errors: make([]string, 0)}

	for rowNum, row := range rows[1:] {
		if !strings.EqualFold(valueAt(row, headers, "fieldtype"), "product") {
			continue
		}

		handleID := strings.TrimSpace(valueAt(row, headers, "handleid"))
		name := strings.TrimSpace(valueAt(row, headers, "name"))
		priceStr := strings.TrimSpace(valueAt(row, headers, "price"))
		if handleID == "" || name == "" || priceStr == "" {
			summary.Skipped++
			summary.Errors = append(summary.Errors, fmt.Sprintf("row %d: missing handleId/name/price", rowNum+2))
			continue
		}

		price, err := parsePriceToPence(priceStr)
		if err != nil {
			summary.Skipped++
			summary.Errors = append(summary.Errors, fmt.Sprintf("row %d: invalid price %q", rowNum+2, priceStr))
			continue
		}

		category := strings.TrimSpace(valueAt(row, headers, "collection"))
		branchSlugs := branchSlugsFromCollection(category)
		slug := toSlug(name)
		if slug == "" {
			slug = toSlug(handleID)
		}

		stock := 0
		if strings.EqualFold(strings.TrimSpace(valueAt(row, headers, "inventory")), "instock") {
			stock = 999
		}

		p := models.Product{
			ExternalID:  handleID,
			SKU:         deriveSKU(valueAt(row, headers, "sku"), category, name, handleID),
			Slug:        slug,
			Name:        name,
			Description: stripHTML(valueAt(row, headers, "description")),
			Price:       price,
			Currency:    "gbp",
			Category:    category,
			ImageURL:    strings.TrimSpace(valueAt(row, headers, "productimageurl")),
			StockQty:    stock,
			IsActive:    parseBoolLoose(valueAt(row, headers, "visible"), true),
			BranchSlugs: branchSlugs,
		}

		if _, err := s.repo.UpsertByExternalOrSlug(ctx, p); err != nil {
			summary.Failed++
			summary.Errors = append(summary.Errors, fmt.Sprintf("row %d: %v", rowNum+2, err))
			continue
		}
		summary.Imported++
	}

	if summary.Imported == 0 {
		return summary, errors.New("no valid products were imported")
	}

	if len(summary.Errors) > 25 {
		summary.Errors = summary.Errors[:25]
	}
	return summary, nil
}

func valueAt(row []string, headers map[string]int, key string) string {
	idx, ok := headers[key]
	if !ok || idx < 0 || idx >= len(row) {
		return ""
	}
	return strings.TrimSpace(row[idx])
}

func parsePriceToPence(raw string) (int64, error) {
	clean := strings.TrimSpace(strings.TrimPrefix(raw, "£"))
	if clean == "" {
		return 0, io.EOF
	}
	f, err := strconv.ParseFloat(clean, 64)
	if err != nil {
		return 0, err
	}
	return int64(f * 100), nil
}

func parseBoolLoose(raw string, fallback bool) bool {
	v := strings.TrimSpace(strings.ToLower(raw))
	switch v {
	case "true", "1", "yes":
		return true
	case "false", "0", "no":
		return false
	default:
		return fallback
	}
}

func stripHTML(in string) string {
	noTags := htmlTagRE.ReplaceAllString(in, " ")
	return strings.TrimSpace(html.UnescapeString(noTags))
}

func toSlug(in string) string {
	s := strings.ToLower(strings.TrimSpace(in))
	s = slugUnsafeRE.ReplaceAllString(s, "-")
	s = strings.Trim(s, "-")
	return s
}

func deriveSKU(existing, category, name, handleID string) string {
	if trimmed := strings.TrimSpace(existing); trimmed != "" {
		return trimmed
	}
	base := strings.Trim(strings.Join([]string{
		toSlug(category),
		toSlug(name),
		toSlug(handleID),
	}, "-"), "-")
	if base == "" {
		return "product-sku"
	}
	return strings.ToUpper(strings.ReplaceAll(base, "-", "_"))
}

func branchSlugsFromCollection(collection string) []string {
	normalized := strings.ToLower(strings.TrimSpace(collection))
	switch {
	case strings.Contains(normalized, "harrow"):
		return []string{"harrow"}
	case strings.Contains(normalized, "pinner"):
		return []string{"pinner"}
	default:
		return nil
	}
}
