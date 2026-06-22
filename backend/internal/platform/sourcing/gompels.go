package sourcing

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"regexp"
	"strconv"
	"strings"
	"time"
)

// GompelsAdapter searches gompels.co.uk by scraping its search results. Gompels
// has no public API, so this parses the HTML — it is BEST-EFFORT and FRAGILE
// (breaks if their markup changes) and is therefore disabled by default
// (GOMPELS_SEARCH_ENABLED). The catalogue cache remains the primary source.
//
// The parser is deliberately tolerant: it extracts product name, code/SKU and
// price with regexes and returns whatever it can; partial failures yield fewer
// offers, never a hard error.
type GompelsAdapter struct {
	client    *http.Client
	searchURL string // template containing %s for the URL-encoded query
}

func NewGompelsAdapter(searchURL string) *GompelsAdapter {
	if searchURL == "" {
		searchURL = "https://www.gompels.co.uk/catalogsearch/result/?q=%s"
	}
	return &GompelsAdapter{
		client:    &http.Client{Timeout: 10 * time.Second},
		searchURL: searchURL,
	}
}

func (g *GompelsAdapter) Supplier() string { return "Gompels" }

func (g *GompelsAdapter) Search(ctx context.Context, term string) ([]Offer, error) {
	u := fmt.Sprintf(g.searchURL, url.QueryEscape(term))
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, u, nil)
	if err != nil {
		return nil, err
	}
	// A realistic UA reduces the chance of being served a bot-block page.
	req.Header.Set("User-Agent", "Mozilla/5.0 (compatible; BlueNestOrderTool/1.0)")
	resp, err := g.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 300 {
		return nil, fmt.Errorf("gompels search: status %d", resp.StatusCode)
	}
	body, err := io.ReadAll(io.LimitReader(resp.Body, 4<<20))
	if err != nil {
		return nil, err
	}
	return ParseGompelsResults(string(body)), nil
}

// price like £11.10 or £1,234.56
var gompelsPriceRe = regexp.MustCompile(`£\s*([0-9]+(?:,[0-9]{3})*(?:\.[0-9]{1,2})?)`)

// product code: Gompels shows "Code: 56358" or data-sku attributes
var gompelsCodeRe = regexp.MustCompile(`(?i)(?:code|sku)["':\s>]+\s*([0-9]{3,8})`)

// ParseGompelsResults extracts offers from a Gompels results/product HTML page.
// Exposed for fixture-based unit tests (no live network).
func ParseGompelsResults(html string) []Offer {
	var offers []Offer
	// Split on Magento product item containers; tolerant of markup variation.
	chunks := regexp.MustCompile(`(?i)<li[^>]*class="[^"]*item[^"]*product[^"]*"`).Split(html, -1)
	for _, chunk := range chunks {
		name := extractGompelsName(chunk)
		code := firstSubmatch(gompelsCodeRe, chunk)
		price := parsePence(firstSubmatch(gompelsPriceRe, chunk))
		if code == "" || price == 0 {
			continue
		}
		offers = append(offers, Offer{
			Supplier:     "Gompels",
			Code:         code,
			Name:         name,
			Price:        price,
			PricePerUnit: price,
		})
	}
	return offers
}

var gompelsNameRe = regexp.MustCompile(`(?is)class="[^"]*product[^"]*name[^"]*"[^>]*>.*?<a[^>]*>(.*?)</a>`)

func extractGompelsName(chunk string) string {
	if m := gompelsNameRe.FindStringSubmatch(chunk); len(m) == 2 {
		return strings.TrimSpace(stripTags(m[1]))
	}
	return ""
}

func firstSubmatch(re *regexp.Regexp, s string) string {
	if m := re.FindStringSubmatch(s); len(m) == 2 {
		return strings.TrimSpace(m[1])
	}
	return ""
}

// parsePence turns "11.10" or "1,234.56" into pence (1110 / 123456).
func parsePence(s string) int64 {
	if s == "" {
		return 0
	}
	s = strings.ReplaceAll(s, ",", "")
	f, err := strconv.ParseFloat(s, 64)
	if err != nil {
		return 0
	}
	return int64(f*100 + 0.5)
}

var tagRe = regexp.MustCompile(`<[^>]+>`)

func stripTags(s string) string { return strings.TrimSpace(tagRe.ReplaceAllString(s, "")) }
