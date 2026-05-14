package server

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"time"

	"github.com/blue-nest-montessori/api/internal/config"
	"github.com/blue-nest-montessori/api/internal/middleware"
	"github.com/blue-nest-montessori/api/internal/platform/email"
	mongoPlatform "github.com/blue-nest-montessori/api/internal/platform/mongo"
	"github.com/blue-nest-montessori/api/internal/repository"
	"github.com/blue-nest-montessori/api/internal/routes"
	"github.com/blue-nest-montessori/api/internal/service"
	"github.com/go-chi/chi/v5"
)

func runBlogPublisher(ctx context.Context, svc service.BlogService, log *slog.Logger) {
	ticker := time.NewTicker(time.Minute)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			n, err := svc.PublishScheduled(ctx)
			if err != nil {
				log.Error("blog scheduler", "err", err)
			} else if n > 0 {
				log.Info("blog scheduler published scheduled posts", "count", n)
			}
		}
	}
}

type Server struct {
	http   *http.Server
	log    *slog.Logger
	mongo  *mongoPlatform.Client
	cancel context.CancelFunc
}

func New(cfg *config.Config, log *slog.Logger) (*Server, error) {
	mongoClient, err := mongoPlatform.Connect(context.Background(), cfg.Mongo.URI, cfg.Mongo.Database, log)
	if err != nil {
		return nil, fmt.Errorf("mongo: %w", err)
	}

	db := mongoClient.DB

	// Ensure uploads directory exists for image uploads
	if err := os.MkdirAll("uploads", 0755); err != nil {
		log.Warn("could not create uploads dir", "err", err)
	}

	// Repositories
	userRepo := repository.NewUserRepository(db)
	productRepo := repository.NewProductRepository(db)
	cartRepo := repository.NewCartRepository(db)
	orderRepo := repository.NewOrderRepository(db)
	blogRepo := repository.NewBlogRepository(db)
	branchRepo := repository.NewBranchRepository(db)
	commentRepo := repository.NewCommentRepository(db)

	enquiryRepo := repository.NewEnquiryRepository(db)
	mailer := email.New(email.Config{
		Host:    cfg.SMTP.Host,
		Port:    cfg.SMTP.Port,
		User:    cfg.SMTP.User,
		Pass:    cfg.SMTP.Pass,
		From:    cfg.SMTP.From,
		AdminTo: cfg.SMTP.AdminTo,
	})

	// Services
	svc := routes.Services{
		Auth:      service.NewAuthService(userRepo, cfg.JWT.Secret, cfg.JWT.ExpiryHours, cfg.JWT.RefreshExpiryDays),
		Products:  service.NewProductService(productRepo),
		Cart:      service.NewCartService(cartRepo, productRepo),
		Checkout:  service.NewCheckoutService(orderRepo, cartRepo, productRepo, cfg.Stripe.SecretKey),
		Orders:    service.NewOrderService(orderRepo),
		Blog:      service.NewBlogService(blogRepo),
		Branches:  service.NewBranchService(branchRepo),
		Enquiries: service.NewEnquiryService(enquiryRepo, mailer, cfg.SMTP.AdminTo),
		Comments:  service.NewCommentService(commentRepo),
	}

	r := chi.NewRouter()
	r.Use(middleware.CORS(cfg.CORS.AllowedOrigins))
	r.Use(middleware.Logger(log))

	routes.Register(r, svc, routes.Repos{Orders: orderRepo, Products: productRepo, Mailer: mailer, AdminTo: cfg.SMTP.AdminTo}, cfg.JWT.Secret, cfg.Stripe.WebhookSecret, cfg)

	bgCtx, cancel := context.WithCancel(context.Background())
	go runBlogPublisher(bgCtx, svc.Blog, log)

	return &Server{
		http: &http.Server{
			Addr:         ":" + cfg.App.Port,
			Handler:      r,
			ReadTimeout:  15 * time.Second,
			WriteTimeout: 15 * time.Second,
			IdleTimeout:  60 * time.Second,
		},
		log:    log,
		mongo:  mongoClient,
		cancel: cancel,
	}, nil
}

func (s *Server) Start() error {
	s.log.Info("server starting", "addr", s.http.Addr)
	return s.http.ListenAndServe()
}

func (s *Server) Shutdown(ctx context.Context) error {
	s.log.Info("server shutting down")
	s.cancel()
	if err := s.http.Shutdown(ctx); err != nil {
		return err
	}
	return s.mongo.Disconnect(ctx)
}
