package server

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"time"

	"github.com/blue-nest-montessori/api/internal/config"
	"github.com/blue-nest-montessori/api/internal/middleware"
	"github.com/blue-nest-montessori/api/internal/repository"
	"github.com/blue-nest-montessori/api/internal/routes"
	"github.com/blue-nest-montessori/api/internal/service"
	mongoPlatform "github.com/blue-nest-montessori/api/internal/platform/mongo"
	"github.com/go-chi/chi/v5"
)

type Server struct {
	http   *http.Server
	log    *slog.Logger
	mongo  *mongoPlatform.Client
}

func New(cfg *config.Config, log *slog.Logger) (*Server, error) {
	mongoClient, err := mongoPlatform.Connect(context.Background(), cfg.Mongo.URI, cfg.Mongo.Database, log)
	if err != nil {
		return nil, fmt.Errorf("mongo: %w", err)
	}

	db := mongoClient.DB

	// Repositories
	userRepo    := repository.NewUserRepository(db)
	productRepo := repository.NewProductRepository(db)
	cartRepo    := repository.NewCartRepository(db)
	orderRepo   := repository.NewOrderRepository(db)
	blogRepo    := repository.NewBlogRepository(db)
	branchRepo  := repository.NewBranchRepository(db)

	// Services
	svc := routes.Services{
		Auth:     service.NewAuthService(userRepo, cfg.JWT.Secret, cfg.JWT.ExpiryHours),
		Products: service.NewProductService(productRepo),
		Cart:     service.NewCartService(cartRepo),
		Checkout: service.NewCheckoutService(),
		Orders:   service.NewOrderService(orderRepo),
		Blog:     service.NewBlogService(blogRepo),
		Branches: service.NewBranchService(branchRepo),
	}

	r := chi.NewRouter()
	r.Use(middleware.CORS(cfg.CORS.FrontendURL))
	r.Use(middleware.Logger(log))

	routes.Register(r, svc, cfg.JWT.Secret, cfg.Stripe.WebhookSecret)

	return &Server{
		http: &http.Server{
			Addr:         ":" + cfg.App.Port,
			Handler:      r,
			ReadTimeout:  15 * time.Second,
			WriteTimeout: 15 * time.Second,
			IdleTimeout:  60 * time.Second,
		},
		log:   log,
		mongo: mongoClient,
	}, nil
}

func (s *Server) Start() error {
	s.log.Info("server starting", "addr", s.http.Addr)
	return s.http.ListenAndServe()
}

func (s *Server) Shutdown(ctx context.Context) error {
	s.log.Info("server shutting down")
	if err := s.http.Shutdown(ctx); err != nil {
		return err
	}
	return s.mongo.Disconnect(ctx)
}
