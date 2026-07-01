package routes

import (
	"net/http"

	"github.com/blue-nest-montessori/api/internal/config"
	"github.com/blue-nest-montessori/api/internal/handler"
	adminHandler "github.com/blue-nest-montessori/api/internal/handler/admin"
	"github.com/blue-nest-montessori/api/internal/handler/webhooks"
	"github.com/blue-nest-montessori/api/internal/middleware"
	"github.com/blue-nest-montessori/api/internal/models"
	"github.com/blue-nest-montessori/api/internal/platform/email"
	"github.com/blue-nest-montessori/api/internal/repository"
	"github.com/blue-nest-montessori/api/internal/service"
	"github.com/go-chi/chi/v5"
	chiMiddleware "github.com/go-chi/chi/v5/middleware"
)

type Services struct {
	Auth             service.AuthService
	Products         service.ProductService
	Cart             service.CartService
	Checkout         service.CheckoutService
	Orders           service.OrderService
	Blog             service.BlogService
	Branches         service.BranchService
	Enquiries        service.EnquiryService
	Comments         service.CommentService
	Audit            service.AuditService
	OrderRequests    service.OrderRequestService
	Catalogue        service.CatalogueService
	PurchaseCarts    service.PurchaseCartService
	OrderTemplates   service.OrderTemplateService
	Suppliers        service.SupplierService
	Procurement      service.ProcurementAnalyticsService
	DashboardLayouts service.DashboardLayoutService
}

type Repos struct {
	Orders   repository.OrderRepository
	Products repository.ProductRepository
	Mailer   *email.Mailer
	AdminTo  string
}

func Register(r *chi.Mux, svc Services, repos Repos, jwtSecret, stripeWebhookSecret string, cfg *config.Config) {
	r.Use(chiMiddleware.Recoverer)
	r.Use(chiMiddleware.RequestID)

	// ── Health ──────────────────────────────────────────────────────────────
	health := handler.NewHealthHandler()
	r.Get("/api/v1/health", health.Check)

	// ── Stripe webhook (raw body required before JSON middleware) ───────────
	stripeWH := webhooks.NewStripeWebhookHandler(stripeWebhookSecret, repos.Orders, repos.Products, repos.Mailer, repos.AdminTo)
	r.Post("/api/v1/webhooks/stripe", stripeWH.Handle)

	r.Route("/api/v1", func(r chi.Router) {
		// ── Auth ──────────────────────────────────────────────────────────
		authH := handler.NewAuthHandler(svc.Auth, cfg)
		r.Post("/auth/register", authH.Register)
		r.Post("/auth/login", authH.Login)
		r.Post("/admin/auth/login", authH.AdminLogin)
		r.Post("/auth/logout", authH.Logout)
		r.Post("/auth/refresh", authH.Refresh)

		// ── Products & categories (public) ────────────────────────────────
		productH := handler.NewProductHandler(svc.Products)
		r.Get("/products", productH.List)
		r.Get("/products/slug/{slug}", productH.GetBySlug)
		r.Get("/products/{id}", productH.Get)
		r.Get("/categories", productH.ListCategories)

		// ── Blog (public) ─────────────────────────────────────────────────
		blogH := handler.NewBlogHandler(svc.Blog)
		r.Get("/blog/posts", blogH.ListPosts)
		r.Get("/blog/posts/{slug}", blogH.GetPost)
		r.Post("/blog/posts/{slug}/like", blogH.LikePost)

		commentH := handler.NewCommentHandler(svc.Comments)
		r.Get("/blog/posts/{slug}/comments", commentH.List)
		r.Post("/blog/posts/{slug}/comments", commentH.Add)

		// ── Branches (public) ─────────────────────────────────────────────
		branchH := handler.NewBranchHandler(svc.Branches)
		r.Get("/branches", branchH.List)
		r.Get("/branches/{slug}", branchH.Get)

		// ── Contact / Enquiries (public) ──────────────────────────────────
		contactH := handler.NewContactHandler(svc.Enquiries)
		r.Post("/contact", contactH.Submit)

		// ── Authenticated routes ───────────────────────────────────────────
		r.Group(func(r chi.Router) {
			r.Use(middleware.Auth(jwtSecret))

			// Identity + capabilities (drives UI nav/page gating).
			r.Get("/auth/me", authH.Me)

			// Per-user customizable dashboard layout (any authenticated user).
			dashH := handler.NewDashboardLayoutHandler(svc.DashboardLayouts)
			r.Get("/me/dashboard", dashH.Get)
			r.Put("/me/dashboard", dashH.Save)

			// Cart
			cartH := handler.NewCartHandler(svc.Cart)
			r.Get("/cart", cartH.Get)
			r.Post("/cart/items", cartH.AddItem)
			r.Put("/cart/items/{id}", cartH.UpdateItem)
			r.Delete("/cart/items/{id}", cartH.RemoveItem)

			// Checkout
			checkoutH := handler.NewCheckoutHandler(svc.Checkout)
			r.Post("/checkout/session", checkoutH.CreateSession)

			// Orders
			orderH := handler.NewOrderHandler(svc.Orders)
			r.Get("/orders/me", orderH.ListMine)
			r.Get("/orders/{id}", orderH.Get)
		})

		// ── Staff supply requests (staff + management, not customers) ───────
		r.Group(func(r chi.Router) {
			r.Use(middleware.Auth(jwtSecret))
			r.Use(middleware.RequireRole("super_admin", "admin", "branch_manager", "staff"))

			orderReqH := handler.NewOrderRequestHandler(svc.OrderRequests, svc.Audit)
			r.Post("/order-requests", orderReqH.Create)
			r.Get("/order-requests/me", orderReqH.ListMine)
			r.Get("/order-requests/{id}", orderReqH.Get)
			r.Patch("/order-requests/{id}/cancel", orderReqH.Cancel)

			// Read-only catalogue for the staff request picker.
			catalogueH := handler.NewCatalogueHandler(svc.Catalogue)
			r.Get("/catalogue", catalogueH.List)

			// Shared standing-order templates.
			templateH := handler.NewOrderTemplateHandler(svc.OrderTemplates)
			r.Get("/order-templates", templateH.List)
			r.Post("/order-templates", templateH.Create)
			r.Delete("/order-templates/{id}", templateH.Delete)
		})

		// ── Admin routes ───────────────────────────────────────────────────
		// The outer gate admits every management role (incl. the Phase-4
		// specialists); each resource group is then gated by a granular
		// permission, so a specialist only reaches the sections it is granted.
		r.Group(func(r chi.Router) {
			r.Use(middleware.Auth(jwtSecret))
			r.Use(middleware.ManagementOnly)

			// Store — products, categories, orders.
			r.Group(func(r chi.Router) {
				r.Use(middleware.RequirePermission(models.PermStoreManage))

				adminOrderH := adminHandler.NewAdminOrderHandler(svc.Orders, svc.Audit)
				r.Get("/admin/orders", adminOrderH.List)
				r.Get("/admin/orders/{id}", adminOrderH.Get)
				r.Patch("/admin/orders/{id}/status", adminOrderH.UpdateStatus)

				adminProductH := adminHandler.NewAdminProductHandler(svc.Products, svc.Audit)
				r.Get("/admin/products", adminProductH.List)
				r.Post("/admin/products/import", adminProductH.ImportCSV)
				r.Post("/admin/products", adminProductH.Create)
				r.Put("/admin/products/{id}", adminProductH.Update)
				r.Delete("/admin/products/{id}", adminProductH.Delete)

				adminCategoryH := adminHandler.NewAdminCategoryHandler(svc.Products, svc.Audit)
				r.Get("/admin/categories", adminCategoryH.List)
				r.Post("/admin/categories", adminCategoryH.Create)
				r.Put("/admin/categories/{id}", adminCategoryH.Update)
				r.Delete("/admin/categories/{id}", adminCategoryH.Delete)
			})

			// Blog / content.
			r.Group(func(r chi.Router) {
				r.Use(middleware.RequirePermission(models.PermBlogManage))
				adminBlogH := adminHandler.NewAdminBlogHandler(svc.Blog, svc.Audit)
				r.Get("/admin/blog/posts", adminBlogH.List)
				r.Post("/admin/blog/posts", adminBlogH.Create)
				r.Put("/admin/blog/posts/{id}", adminBlogH.Update)
				r.Delete("/admin/blog/posts/{id}", adminBlogH.Delete)
				r.Post("/admin/blog/publish-scheduled", adminBlogH.TriggerPublishScheduled)
				r.Post("/admin/uploads/image", adminBlogH.UploadImage)
			})

			// Enquiries / admissions CRM.
			r.Group(func(r chi.Router) {
				r.Use(middleware.RequirePermission(models.PermEnquiriesManage))
				adminEnquiryH := adminHandler.NewAdminEnquiryHandler(svc.Enquiries, svc.Auth, svc.Audit)
				r.Get("/admin/enquiries", adminEnquiryH.List)
				r.Get("/admin/enquiries/page", adminEnquiryH.ListPaged)
				r.Get("/admin/enquiries/stats", adminEnquiryH.Stats)
				r.Get("/admin/enquiries/tasks", adminEnquiryH.Tasks)
				r.Get("/admin/enquiries/assignees", adminEnquiryH.Assignees)
				r.Post("/admin/enquiries/bulk", adminEnquiryH.Bulk)
				r.Get("/admin/enquiries/{id}", adminEnquiryH.Get)
				r.Patch("/admin/enquiries/{id}/status", adminEnquiryH.UpdateStatus)
				r.Post("/admin/enquiries/{id}/notes", adminEnquiryH.AddNote)
				r.Patch("/admin/enquiries/{id}/follow-up", adminEnquiryH.UpdateFollowUp)
				r.Patch("/admin/enquiries/{id}/assign", adminEnquiryH.Assign)
				r.Post("/admin/enquiries/{id}/register", adminEnquiryH.Register)
				r.Post("/admin/enquiries/{id}/reply", adminEnquiryH.LogReply)
			})

			// Audit / activity log.
			r.Group(func(r chi.Router) {
				r.Use(middleware.RequirePermission(models.PermAuditView))
				adminAuditH := adminHandler.NewAdminAuditLogHandler(svc.Audit)
				r.Get("/admin/audit-logs", adminAuditH.List)
			})

			// Procurement — supply requests, catalogue, purchase orders.
			r.Group(func(r chi.Router) {
				r.Use(middleware.RequirePermission(models.PermProcurementManage))

				adminOrderReqH := adminHandler.NewAdminOrderRequestHandler(svc.OrderRequests, svc.Audit)
				r.Get("/admin/order-requests", adminOrderReqH.List)
				r.Get("/admin/order-requests/{id}", adminOrderReqH.Get)
				r.Patch("/admin/order-requests/{id}/status", adminOrderReqH.UpdateStatus)

				adminCatalogueH := adminHandler.NewAdminCatalogueHandler(svc.Catalogue, svc.Audit)
				r.Get("/admin/catalogue", adminCatalogueH.List)
				r.Get("/admin/catalogue/{id}", adminCatalogueH.Get)
				r.Post("/admin/catalogue", adminCatalogueH.Create)
				r.Post("/admin/catalogue/learn", adminCatalogueH.Learn)
				r.Put("/admin/catalogue/{id}", adminCatalogueH.Update)
				r.Delete("/admin/catalogue/{id}", adminCatalogueH.Delete)

				adminCartH := adminHandler.NewAdminPurchaseCartHandler(svc.PurchaseCarts, svc.Audit)
				r.Post("/admin/purchase-carts/generate", adminCartH.Generate)
				r.Get("/admin/purchase-carts", adminCartH.List)
				r.Get("/admin/purchase-carts/{id}", adminCartH.Get)
				r.Put("/admin/purchase-carts/{id}", adminCartH.Update)
				r.Post("/admin/purchase-carts/{id}/exported", adminCartH.Exported)
				r.Patch("/admin/purchase-carts/{id}/fulfillment", adminCartH.UpdateFulfillment)
				r.Patch("/admin/purchase-carts/{id}/status", adminCartH.UpdateStatus)
				r.Post("/admin/purchase-carts/{id}/receive", adminCartH.Receive)
			})

			// Suppliers directory.
			r.Group(func(r chi.Router) {
				r.Use(middleware.RequirePermission(models.PermSuppliersManage))
				adminSupplierH := adminHandler.NewAdminSupplierHandler(svc.Suppliers, svc.Audit)
				r.Get("/admin/suppliers", adminSupplierH.List)
				r.Get("/admin/suppliers/{id}", adminSupplierH.Get)
				r.Post("/admin/suppliers", adminSupplierH.Create)
				r.Put("/admin/suppliers/{id}", adminSupplierH.Update)
				r.Delete("/admin/suppliers/{id}", adminSupplierH.Delete)
			})

			// Procurement analytics (finance view).
			r.Group(func(r chi.Router) {
				r.Use(middleware.RequirePermission(models.PermFinanceView))
				adminProcurementH := adminHandler.NewAdminProcurementHandler(svc.Procurement)
				r.Get("/admin/procurement/analytics", adminProcurementH.Analytics)
			})

			// Account management — super admin only.
			r.Group(func(r chi.Router) {
				r.Use(middleware.SuperAdminOnly)
				adminUserH := adminHandler.NewAdminUserHandler(svc.Auth, svc.Audit)
				r.Get("/admin/users", adminUserH.List)
				r.Post("/admin/users", adminUserH.Create)
				r.Put("/admin/users/{id}", adminUserH.Update)
				r.Post("/admin/users/{id}/reset-password", adminUserH.ResetPassword)
				r.Delete("/admin/users/{id}", adminUserH.Delete)
			})
		})
	})

	// ── Static uploads ────────────────────────────────────────────────────────
	r.Handle("/uploads/*", http.StripPrefix("/uploads", http.FileServer(http.Dir("uploads"))))

	// ── 404 fallback ────────────────────────────────────────────────────────
	r.NotFound(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusNotFound)
		_, _ = w.Write([]byte(`{"error":"route not found"}`))
	})
}
