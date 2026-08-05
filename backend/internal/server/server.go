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
	"github.com/blue-nest-montessori/api/internal/platform/sourcing"
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
	counterRepo := repository.NewCounterRepository(db)
	orderRepo := repository.NewOrderRepository(db, counterRepo)
	blogRepo := repository.NewBlogRepository(db)
	branchRepo := repository.NewBranchRepository(db)
	commentRepo := repository.NewCommentRepository(db)

	enquiryRepo := repository.NewEnquiryRepository(db)
	auditRepo := repository.NewAuditLogRepository(db)
	orderRequestRepo := repository.NewOrderRequestRepository(db)
	catalogueRepo := repository.NewCatalogueItemRepository(db)
	purchaseCartRepo := repository.NewPurchaseCartRepository(db)
	orderTemplateRepo := repository.NewOrderTemplateRepository(db)
	supplierRepo := repository.NewSupplierRepository(db)
	taxonomyRepo := repository.NewTaxonomyRepository(db)
	feeConfigRepo := repository.NewFeeConfigRepository(db)
	termRepo := repository.NewTermRepository(db)
	dashboardLayoutRepo := repository.NewDashboardLayoutRepository(db)
	dashboardProfileRepo := repository.NewDashboardProfileRepository(db)
	roomRepo := repository.NewRoomRepository(db)
	childRepo := repository.NewChildRepository(db)
	attendanceRepo := repository.NewAttendanceRepository(db)
	staffRepo := repository.NewStaffRepository(db)
	staffRoomAssignRepo := repository.NewStaffRoomAssignmentRepository(db)
	childRoomAssignRepo := repository.NewChildRoomAssignmentRepository(db)
	staffAttendanceRepo := repository.NewStaffAttendanceRepository(db)
	kioskDeviceRepo := repository.NewKioskDeviceRepository(db)
	shiftRepo := repository.NewShiftRepository(db)
	dailyRecordRepo := repository.NewDailyRecordRepository(db)
	notificationRepo := repository.NewNotificationRepository(db)
	leaveRequestRepo := repository.NewLeaveRequestRepository(db)
	gbpRepo := repository.NewGBPRepository(db)
	roleRepo := repository.NewRoleRepository(db)
	orgRepo := repository.NewOrganisationRepository(db)
	mailer := email.New(email.Config{
		Host:         cfg.SMTP.Host,
		Port:         cfg.SMTP.Port,
		User:         cfg.SMTP.User,
		Pass:         cfg.SMTP.Pass,
		From:         cfg.SMTP.From,
		AdminTo:      cfg.SMTP.AdminTo,
		ResendAPIKey: cfg.SMTP.ResendAPIKey,
	})

	// Services
	authSvc := service.NewAuthService(userRepo, cfg.JWT.Secret, cfg.JWT.ExpiryHours, cfg.JWT.RefreshExpiryDays)
	// Room allocation is the single source of truth for staff/child rooms; the
	// staff/child/attendance/kiosk services READ from these assignment repos to
	// project the current room (no stored scalar, no sync).
	staffRoomAssignSvc := service.NewStaffRoomAssignmentService(staffRoomAssignRepo, staffRepo, roomRepo)
	childRoomAssignSvc := service.NewChildRoomAssignmentService(childRoomAssignRepo, childRepo, roomRepo, staffRoomAssignRepo, attendanceRepo)
	staffAttSvc := service.NewStaffAttendanceService(staffAttendanceRepo, staffRepo, shiftRepo, roomRepo, staffRoomAssignRepo, termRepo)
	notifSvc := service.NewNotificationService(notificationRepo)
	orgSvc := service.NewOrganisationService(orgRepo, authSvc)
	// Resolve the default tenant for public/unauthenticated requests. Empty until
	// the tenancy migration creates it - then public data is scoped to that org.
	defaultOrgID := ""
	defaultOrgSlug := os.Getenv("DEFAULT_ORG_SLUG")
	if defaultOrgSlug == "" {
		defaultOrgSlug = "blue-nest"
	}
	if o, err := orgSvc.GetBySlug(context.Background(), defaultOrgSlug); err == nil && o != nil {
		defaultOrgID = o.ID.Hex()
	}
	// Hoisted so the branch-template service can reuse the same room + branch
	// services (apply-template creates rooms; capture-from-branch reads them).
	roomSvc := service.NewRoomServiceWithGuards(roomRepo, staffRoomAssignRepo, childRoomAssignRepo)
	branchSvc := service.NewBranchService(branchRepo, counterRepo)
	svc := routes.Services{
		Organisations:     orgSvc,
		DefaultOrgID:      defaultOrgID,
		Auth:              authSvc,
		Products:          service.NewProductService(productRepo),
		Cart:              service.NewCartService(cartRepo, productRepo),
		Checkout:          service.NewCheckoutService(orderRepo, cartRepo, productRepo, branchRepo, cfg.Stripe.SecretKey, cfg.App.Env),
		Orders:            service.NewOrderService(orderRepo),
		Blog:              service.NewBlogService(blogRepo),
		Branches:          branchSvc,
		Enquiries:         service.NewEnquiryService(enquiryRepo, mailer, cfg.SMTP.AdminTo),
		Comments:          service.NewCommentService(commentRepo),
		Audit:             service.NewAuditService(auditRepo),
		OrderRequests:     service.NewOrderRequestService(orderRequestRepo, userRepo, counterRepo),
		Catalogue:         service.NewCatalogueService(catalogueRepo),
		OrderTemplates:    service.NewOrderTemplateService(orderTemplateRepo),
		Suppliers:         service.NewSupplierService(supplierRepo),
		Taxonomy:          service.NewTaxonomyService(taxonomyRepo),
		FeeConfig:         service.NewFeeConfigService(feeConfigRepo),
		BranchTemplates:   service.NewBranchTemplateService(repository.NewBranchTemplateRepository(db), roomSvc, branchSvc),
		Terms:             service.NewTermService(termRepo),
		Procurement:       service.NewProcurementAnalyticsService(orderRequestRepo, purchaseCartRepo),
		DashboardLayouts:  service.NewDashboardLayoutService(dashboardLayoutRepo),
		DashboardProfiles: service.NewDashboardProfileService(dashboardProfileRepo),
		Rooms:             roomSvc,
		Children:          service.NewChildService(childRepo, roomRepo, counterRepo, staffRepo, childRoomAssignSvc, taxonomyRepo),
		Attendance:        service.NewAttendanceService(attendanceRepo, childRepo, childRoomAssignRepo),
		Staff:             service.NewStaffService(staffRepo, counterRepo, authSvc, staffRoomAssignSvc, roomRepo),
		StaffRoomAssign:   staffRoomAssignSvc,
		ChildRoomAssign:   childRoomAssignSvc,
		StaffAttendance:   staffAttSvc,
		LeaveRequests:     service.NewLeaveRequestService(leaveRequestRepo, staffRepo, userRepo, staffAttSvc, notifSvc),
		Me:                service.NewMeService(staffRepo, staffAttSvc, staffAttendanceRepo, shiftRepo),
		Kiosk:             service.NewKioskService(kioskDeviceRepo, staffRepo, staffAttendanceRepo, branchRepo, roomRepo, staffRoomAssignRepo, staffAttSvc),
		Shifts:            service.NewShiftService(shiftRepo, staffRepo, roomRepo, leaveRequestRepo),
		DailyRecords:      service.NewDailyRecordService(dailyRecordRepo, childRepo, counterRepo, childRoomAssignRepo, userRepo, notifSvc),
		Notifications:     notifSvc,
		BranchOverview:    service.NewBranchOverviewService(childRepo, roomRepo, attendanceRepo, staffRepo, staffAttendanceRepo, dailyRecordRepo, enquiryRepo),
		GBP:               service.NewGBPService(gbpRepo, branchRepo),
		Roles:             service.NewRoleService(roleRepo),
	}

	// Seed built-in roles + load the effective role→permission cache for every
	// organisation (the cache is keyed per-org, so each tenant needs its own
	// seed+refresh pass - see models.SetRolePermissions).
	if orgs, err := orgRepo.FindAll(context.Background()); err != nil {
		log.Warn("could not list organisations for role seeding", "err", err)
	} else {
		orgIDs := make([]string, len(orgs))
		for i, o := range orgs {
			orgIDs[i] = o.ID.Hex()
		}
		if err := svc.Roles.EnsureSeeded(context.Background(), orgIDs); err != nil {
			log.Warn("could not seed/load roles", "err", err)
		}
	}

	// Sourcing engine: enable supplier adapters per config (off by default; the
	// catalogue cache is the primary, deterministic source of offers).
	var sourceAdapters []sourcing.SupplierSearch
	if cfg.Sourcing.GompelsSearchEnabled {
		sourceAdapters = append(sourceAdapters, sourcing.NewGompelsAdapter(cfg.Sourcing.GompelsSearchURL))
	}
	if cfg.Sourcing.AmazonBusinessEnabled {
		sourceAdapters = append(sourceAdapters, sourcing.NewAmazonAdapter())
	}
	sourcingEngine := sourcing.NewEngine(sourceAdapters...)
	svc.PurchaseCarts = service.NewPurchaseCartService(purchaseCartRepo, orderRequestRepo, catalogueRepo, sourcingEngine, counterRepo)

	r := chi.NewRouter()
	r.Use(middleware.CORS(cfg.CORS.AllowedOrigins))
	r.Use(middleware.Logger(log))

	routes.Register(r, svc, routes.Repos{
		Orders:       orderRepo,
		Products:     productRepo,
		Branches:     branchRepo,
		Mailer:       mailer,
		AdminTo:      cfg.SMTP.AdminTo,
		OrderAdminTo: cfg.SMTP.OrderAdminTo,
		OrderBATo:    cfg.SMTP.OrderBATo,
	}, cfg.JWT.Secret, cfg.Stripe.WebhookSecret, cfg)

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
