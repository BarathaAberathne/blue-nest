package service

import (
	"context"

	"github.com/blue-nest-montessori/api/internal/models"
	"github.com/blue-nest-montessori/api/internal/repository"
)

type BlogService interface {
	ListPublished(ctx context.Context) ([]models.BlogPost, error)
	ListAll(ctx context.Context) ([]models.BlogPost, error)
	GetBySlug(ctx context.Context, slug string) (*models.BlogPost, error)
	Create(ctx context.Context, post models.BlogPost) (*models.BlogPost, error)
	Update(ctx context.Context, id string, post models.BlogPost) (*models.BlogPost, error)
	Delete(ctx context.Context, id string) error
	LikePost(ctx context.Context, slug string) (int64, error)
	PublishScheduled(ctx context.Context) (int, error)
}

type blogService struct {
	repo repository.BlogRepository
}

func NewBlogService(repo repository.BlogRepository) BlogService {
	return &blogService{repo: repo}
}

func (s *blogService) ListPublished(ctx context.Context) ([]models.BlogPost, error) {
	return s.repo.FindPublished(ctx)
}

func (s *blogService) ListAll(ctx context.Context) ([]models.BlogPost, error) {
	return s.repo.FindAll(ctx)
}

func (s *blogService) GetBySlug(ctx context.Context, slug string) (*models.BlogPost, error) {
	return s.repo.FindBySlug(ctx, slug)
}

func (s *blogService) Create(ctx context.Context, post models.BlogPost) (*models.BlogPost, error) {
	return s.repo.Create(ctx, post)
}

func (s *blogService) Update(ctx context.Context, id string, post models.BlogPost) (*models.BlogPost, error) {
	return s.repo.Update(ctx, id, post)
}

func (s *blogService) Delete(ctx context.Context, id string) error {
	return s.repo.Delete(ctx, id)
}

func (s *blogService) LikePost(ctx context.Context, slug string) (int64, error) {
	return s.repo.IncrementLike(ctx, slug)
}

func (s *blogService) PublishScheduled(ctx context.Context) (int, error) {
	due, err := s.repo.FindScheduledDue(ctx)
	if err != nil {
		return 0, err
	}
	count := 0
	for _, post := range due {
		if err := s.repo.Publish(ctx, post.ID.Hex()); err == nil {
			count++
		}
	}
	return count, nil
}
