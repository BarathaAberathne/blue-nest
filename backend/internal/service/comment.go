package service

import (
	"context"
	"errors"

	"github.com/blue-nest-montessori/api/internal/models"
	"github.com/blue-nest-montessori/api/internal/repository"
)

type CommentService interface {
	AddComment(ctx context.Context, slug string, req models.CommentRequest) (*models.Comment, error)
	ListComments(ctx context.Context, slug string) ([]models.Comment, error)
}

type commentService struct {
	repo repository.CommentRepository
}

func NewCommentService(repo repository.CommentRepository) CommentService {
	return &commentService{repo: repo}
}

func (s *commentService) AddComment(ctx context.Context, slug string, req models.CommentRequest) (*models.Comment, error) {
	if req.Name == "" || req.Body == "" {
		return nil, errors.New("name and comment are required")
	}
	c := &models.Comment{
		PostSlug: slug,
		Name:     req.Name,
		Body:     req.Body,
	}
	if err := s.repo.Create(ctx, c); err != nil {
		return nil, err
	}
	return c, nil
}

func (s *commentService) ListComments(ctx context.Context, slug string) ([]models.Comment, error) {
	return s.repo.FindByPostSlug(ctx, slug)
}
