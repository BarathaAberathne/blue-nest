package routes

import (
	"net/http"

	"github.com/blue-nest-montessori/api/internal/handler"
	adminHandler "github.com/blue-nest-montessori/api/internal/handler/admin"
	"github.com/blue-nest-montessori/api/internal/handler/webhooks"
	"github.com/blue-nest-montessori/api/internal/middleware"
	"github.com/blue-nest-montessori/api/internal/service"
	"github.com/go-chi/chi/v5"
	chiMiddleware "github.com/go-chi/chi/v5/middleware"
)

type Services struct {
	Auth     service.AuthService
	Products service.ProductService
	Cart     service.CartService
	Checkout service.CheckoutService
	Orders   service.OrderService
	Blog     service.BlogService
	Branches service.BranchService
}

func Register(r *chi.Mux, svc Services, jwtSecret, stripeWebhookSecret string) {
	r.Use(chiMiddleware.Recoverer)
	r.Use(chiMiddleware.RequestID)

	// ── Health ──────────────────────────────────────────────────────────────
	health := handler.NewHealthHandler()
	r.Get("/api/v1/health", health.Check)

	// ── Stripe webhook (raw body required before JSON middleware) ───────────
	stripeWH := webhooks.NewStripeWebhookHandler(stripeWebhookSecret)
	r.Post("/api/v1/webhooks/stripe", stripeWH.Handle)

	r.Route("/api/v1", func(r chi.Router) {
		// ── Auth ──────────────────────────────────────────────────────────
		authH := handler.NewAuthHandler(svc.Auth)
		r.Post("/auth/register", authH.Register)
		r.Post("/auth/login", authH.Login)
		r.Post("/auth/logout", authH.Logout)
		r.Post("/auth/refresh", authH.Refresh)

		// ── Products & categories (public) ────────────────────────────────
		productH := handler.NewProductHandler(svc.Products)
		r.Get("/products", productH.List)
		r.Get("/products/{id}", productH.Get)
		r.Get("/categories", productH.ListCategories)

		// ── Blog (public) ─────────────────────────────────────────────────
		blogH := handler.NewBlogHandler(svc.Blog)
		r.Get("/blog/posts", blogH.ListPosts)
		r.Get("/blog/posts/{slug}", blogH.GetPost)

		// ── Branches (public) ─────────────────────────────────────────────
		branchH := handler.NewBranchHandler(svc.Branches)
		r.Get("/branches", branchH.List)
		r.Get("/branches/{slug}", branchH.Get)

		// ── Authenticated routes ───────────────────────────────────────────
		r.Group(func(r chi.Router) {
			r.Use(middleware.Auth(jwtSecret))

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

		// ── Admin routes ───────────────────────────────────────────────────
		r.Group(func(r chi.Router) {
			r.Use(middleware.Auth(jwtSecret))
			r.Use(middleware.AdminOnly)

			adminOrderH := adminHandler.NewAdminOrderHandler(svc.Orders)
			r.Get("/admin/orders", adminOrderH.List)
			r.Get("/admin/orders/{id}", adminOrderH.Get)
			r.Patch("/admin/orders/{id}/status", adminOrderH.UpdateStatus)

			adminProductH := adminHandler.NewAdminProductHandler(svc.Products)
			r.Get("/admin/products", adminProductH.List)
			r.Post("/admin/products", adminProductH.Create)
			r.Put("/admin/products/{id}", adminProductH.Update)
			r.Delete("/admin/products/{id}", adminProductH.Delete)

			adminBlogH := adminHandler.NewAdminBlogHandler(svc.Blog)
			r.Get("/admin/blog/posts", adminBlogH.List)
			r.Post("/admin/blog/posts", adminBlogH.Create)
			r.Put("/admin/blog/posts/{id}", adminBlogH.Update)
		})
	})

	// ── 404 fallback ────────────────────────────────────────────────────────
	r.NotFound(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusNotFound)
		_, _ = w.Write([]byte(`{"error":"route not found"}`))
	})
}
