package service

import (
	"context"
	"sort"
	"strings"
	"time"

	"github.com/blue-nest-montessori/api/internal/models"
	"github.com/blue-nest-montessori/api/internal/repository"
)

// GBPService is the integration layer for Google Business Profile data. The
// Claude GBP-monitoring automation POSTs a daily digest per branch; we store a
// historical snapshot, upsert reviews and refresh the branch's cached signals.
// Reads degrade gracefully to the last successful sync.
type GBPService interface {
	IngestDigest(ctx context.Context, req models.GBPDigestRequest) error
	BranchReviews(ctx context.Context, slug string) (*models.ReviewsAnalytics, error)
}

type gbpService struct {
	repo     repository.GBPRepository
	branches repository.BranchRepository
}

func NewGBPService(repo repository.GBPRepository, branches repository.BranchRepository) GBPService {
	return &gbpService{repo: repo, branches: branches}
}

func sentimentOf(rating int, given string) string {
	if given != "" {
		return given
	}
	switch {
	case rating >= 4:
		return "positive"
	case rating == 3:
		return "neutral"
	default:
		return "negative"
	}
}

func (s *gbpService) IngestDigest(ctx context.Context, req models.GBPDigestRequest) error {
	date := req.Date
	if date == "" {
		date = time.Now().Format("2006-01-02")
	}
	source := req.Source
	if source == "" {
		source = "claude-digest"
	}
	if err := s.repo.UpsertDigest(ctx, models.BranchDigest{
		BranchSlug: req.BranchSlug, Date: date, Rating: req.Rating, ReviewCount: req.ReviewCount,
		Insights: req.Insights, Keywords: req.Keywords, Sentiment: req.Sentiment, Source: source,
	}); err != nil {
		return err
	}
	for _, rv := range req.Reviews {
		rvDate := rv.Date
		if rvDate == "" {
			rvDate = date
		}
		if err := s.repo.UpsertReview(ctx, models.GBPReview{
			BranchSlug: req.BranchSlug, ReviewID: rv.ReviewID, Author: rv.Author, Rating: rv.Rating,
			Text: rv.Text, Date: rvDate, Reply: rv.Reply, Sentiment: sentimentOf(rv.Rating, rv.Sentiment),
		}); err != nil {
			return err
		}
	}
	// Refresh the branch's cached headline signals (best-effort).
	if req.Rating > 0 || req.ReviewCount > 0 {
		_ = s.branches.UpdateGoogleCache(ctx, req.BranchSlug, req.Rating, req.ReviewCount)
	}
	return nil
}

func (s *gbpService) BranchReviews(ctx context.Context, slug string) (*models.ReviewsAnalytics, error) {
	a := &models.ReviewsAnalytics{Slug: slug}

	reviews, _ := s.repo.FindReviews(ctx, slug, 0)
	sentiment := models.SentimentSplit{}
	var kwFallback map[string]int
	for _, rv := range reviews {
		if rv.Rating >= 1 && rv.Rating <= 5 {
			a.Distribution[rv.Rating-1]++
		}
		switch sentimentOf(rv.Rating, rv.Sentiment) {
		case "positive":
			sentiment.Positive++
		case "neutral":
			sentiment.Neutral++
		default:
			sentiment.Negative++
		}
		if rv.Rating <= 3 {
			a.Negative = append(a.Negative, rv)
		}
	}
	_ = kwFallback
	a.ReviewCount = len(reviews)

	// Recent reviews (already sorted desc by date from the repo).
	if len(reviews) > 8 {
		a.Recent = reviews[:8]
	} else {
		a.Recent = reviews
	}
	if len(a.Negative) > 6 {
		a.Negative = a.Negative[:6]
	}

	pending, _ := s.repo.CountPendingReplies(ctx, slug)
	a.PendingReplies = pending

	// Latest digest → headline rating, insights, keywords, last-sync, staleness.
	if latest, _ := s.repo.LatestDigest(ctx, slug); latest != nil {
		a.Rating = latest.Rating
		if latest.ReviewCount > a.ReviewCount {
			a.ReviewCount = latest.ReviewCount
		}
		a.Insights = latest.Insights
		a.Keywords = latest.Keywords
		if latest.Sentiment.Positive+latest.Sentiment.Neutral+latest.Sentiment.Negative > 0 {
			sentiment = latest.Sentiment
		}
		t := latest.CreatedAt
		a.LastSync = &t
		if d, ok := parseDate(latest.Date); ok {
			a.Stale = time.Since(d) > 48*time.Hour
		}
	} else {
		a.Stale = true
	}
	a.Sentiment = sentiment

	// Rating trend from the digest history (last ~90 days).
	if trend, _ := s.repo.TrendDigests(ctx, slug, 120); len(trend) > 0 {
		for _, d := range trend {
			a.Trend = append(a.Trend, models.RatingPoint{Date: d.Date, Rating: d.Rating})
		}
	}

	// Fall back to computing keywords from review text if the digest had none.
	if len(a.Keywords) == 0 && len(reviews) > 0 {
		a.Keywords = topKeywords(reviews, 12)
	}
	return a, nil
}

func parseDate(s string) (time.Time, bool) {
	t, err := time.Parse("2006-01-02", s)
	return t, err == nil
}

var stopWords = map[string]bool{
	"the": true, "and": true, "for": true, "our": true, "was": true, "are": true, "with": true,
	"they": true, "this": true, "that": true, "have": true, "very": true, "here": true, "from": true,
	"has": true, "her": true, "his": true, "she": true, "him": true, "you": true, "your": true,
	"nursery": true, "staff": true, "would": true, "been": true, "were": true, "their": true,
}

// topKeywords is a lightweight fallback word-frequency over review text.
func topKeywords(reviews []models.GBPReview, n int) []models.LabelCount {
	counts := map[string]int{}
	for _, rv := range reviews {
		for _, w := range strings.Fields(strings.ToLower(rv.Text)) {
			w = strings.Trim(w, ".,!?\"'()")
			if len(w) < 4 || stopWords[w] {
				continue
			}
			counts[w]++
		}
	}
	out := make([]models.LabelCount, 0, len(counts))
	for k, v := range counts {
		out = append(out, models.LabelCount{Label: k, Count: v})
	}
	sort.Slice(out, func(i, j int) bool {
		if out[i].Count != out[j].Count {
			return out[i].Count > out[j].Count
		}
		return out[i].Label < out[j].Label
	})
	if len(out) > n {
		out = out[:n]
	}
	return out
}
