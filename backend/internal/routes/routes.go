package routes

import (
	"net/http"
	"time"

	"github.com/blue-nest-montessori/api/internal/config"
	"github.com/blue-nest-montessori/api/internal/handler"
	adminHandler "github.com/blue-nest-montessori/api/internal/handler/admin"
	"github.com/blue-nest-montessori/api/internal/handler/integrations"
	"github.com/blue-nest-montessori/api/internal/handler/webhooks"
	"github.com/blue-nest-montessori/api/internal/middleware"
	"github.com/blue-nest-montessori/api/internal/models"
	"github.com/blue-nest-montessori/api/internal/platform/email"
	"github.com/blue-nest-montessori/api/internal/repository"
	"github.com/blue-nest-montessori/api/pkg/response"
	"github.com/blue-nest-montessori/api/pkg/validator"
	"github.com/blue-nest-montessori/api/internal/service"
	"github.com/go-chi/chi/v5"
	chiMiddleware "github.com/go-chi/chi/v5/middleware"
)

type Services struct {
	Organisations     service.OrganisationService
	DefaultOrgID      string // tenant for unauthenticated/public requests
	Auth              service.AuthService
	Products          service.ProductService
	Cart              service.CartService
	Checkout          service.CheckoutService
	Orders            service.OrderService
	Blog              service.BlogService
	Branches          service.BranchService
	Enquiries         service.EnquiryService
	Comments          service.CommentService
	Audit             service.AuditService
	OrderRequests     service.OrderRequestService
	Catalogue         service.CatalogueService
	PurchaseCarts     service.PurchaseCartService
	OrderTemplates    service.OrderTemplateService
	Suppliers         service.SupplierService
	Procurement       service.ProcurementAnalyticsService
	DashboardLayouts  service.DashboardLayoutService
	DashboardProfiles service.DashboardProfileService
	Rooms             service.RoomService
	Children          service.ChildService
	Parents           service.ParentService
	Attendance        service.AttendanceService
	Staff             service.StaffService
	StaffAttendance   service.StaffAttendanceService
	LeaveRequests     service.LeaveRequestService
	Me                service.MeService
	StaffRoomAssign   service.StaffRoomAssignmentService
	ChildRoomAssign   service.ChildRoomAssignmentService
	Kiosk             service.KioskService
	Shifts            service.ShiftService
	DailyRecords      service.DailyRecordService
	BranchOverview    service.BranchOverviewService
	GBP               service.GBPService
	Roles             service.RoleService
	Taxonomy          service.TaxonomyService
	Terms             service.TermService
	Notifications     service.NotificationService
	FeeConfig         service.FeeConfigService
	BranchTemplates   service.BranchTemplateService
	EmailTemplates    service.EmailTemplateService
	NotifPrefs        service.NotificationPreferenceService
}

type Repos struct {
	Orders       repository.OrderRepository
	Products     repository.ProductRepository
	Branches     repository.BranchRepository
	Mailer       *email.Mailer
	AdminTo      string
	OrderAdminTo string
	OrderBATo    string
}

func Register(r *chi.Mux, svc Services, repos Repos, jwtSecret, stripeWebhookSecret string, cfg *config.Config) {
	r.Use(chiMiddleware.Recoverer)
	r.Use(chiMiddleware.RequestID)

	// ── Health ──────────────────────────────────────────────────────────────
	health := handler.NewHealthHandler()
	r.Get("/api/v1/health", health.Check)

	// ── Stripe webhook (raw body required before JSON middleware) ───────────
	stripeWH := webhooks.NewStripeWebhookHandler(stripeWebhookSecret, repos.Orders, repos.Products, repos.Branches, repos.Mailer, repos.OrderAdminTo, repos.OrderBATo)
	r.Post("/api/v1/webhooks/stripe", stripeWH.Handle)

	// ── GBP digest ingest (shared-secret webhook, no user JWT) ──────────────
	gbpWH := integrations.NewGBPHandler(svc.GBP, cfg.GBPIngestSecret)
	r.Post("/api/v1/integrations/gbp/digest", gbpWH.IngestDigest)

	r.Route("/api/v1", func(r chi.Router) {
		// Multi-tenancy: pin every request to a tenant. Public/unauthenticated
		// routes get the default org; the Auth middleware on management/customer
		// groups overrides this with the caller's own org from their JWT.
		r.Use(middleware.DefaultTenant(svc.DefaultOrgID))

		// ── Auth ──────────────────────────────────────────────────────────
		authH := handler.NewAuthHandler(svc.Auth, svc.Organisations, cfg)
		// Login is credential-guessable - rate-limit per IP so a script can't
		// brute-force/credential-stuff it (every other public-but-abusable group
		// in this file, e.g. the kiosk, already does this; login was the gap).
		r.Group(func(r chi.Router) {
			r.Use(middleware.RateLimit(10, time.Minute))
			r.Post("/auth/login", authH.Login)
			r.Post("/admin/auth/login", authH.AdminLogin)
		})
		r.Post("/auth/register", authH.Register)
	// Parent portal activation: single-use invitation token → password set.
	// NOTE: runs under DefaultTenant — like all public routes — so invitations
	// currently activate for the default org only (multi-org portal activation
	// follows the kiosk cross-org pattern later).
	r.Post("/auth/portal/activate", func(w http.ResponseWriter, req *http.Request) {
		var body models.InviteAcceptRequest
		if err := validator.DecodeJSON(req, &body); err != nil {
			response.BadRequest(w, err.Error())
			return
		}
		p, err := svc.Parents.AcceptInvite(req.Context(), body)
		if err != nil {
			response.BadRequest(w, err.Error())
			return
		}
		response.OK(w, p)
	})
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

		// ── Configurable lists (public read) - the application form needs the
		// session-type slots (?category=session_type&branch=<slug>).
		taxonomyPublicH := handler.NewTaxonomyHandler(svc.Taxonomy)
		r.Get("/taxonomy", taxonomyPublicH.List)
		feeConfigPublicH := handler.NewFeeConfigHandler(svc.FeeConfig)
		r.Get("/fee-config", feeConfigPublicH.Bundle)

		// ── Contact / Enquiries (public) ──────────────────────────────────
		contactH := handler.NewContactHandler(svc.Enquiries)
		r.Post("/contact", contactH.Submit)

		// ── Kiosk (entrance tablet) ───────────────────────────────────────
		// Isolated from the CMS: device-token auth (X-Kiosk-Token), rate-limited,
		// exposes only staff search + clock in/out within the device's branch.
		r.Group(func(r chi.Router) {
			kioskH := handler.NewKioskHandler(svc.Kiosk)
			r.Use(middleware.RateLimit(90, time.Minute))
			r.Use(middleware.KioskAuth(svc.Kiosk.Authenticate))
			r.Post("/kiosk/session", kioskH.Session)
			r.Get("/kiosk/staff", kioskH.Search)
			r.Get("/kiosk/overview", kioskH.Overview)
			r.Post("/kiosk/clock-in", kioskH.ClockIn)
			r.Post("/kiosk/clock-out", kioskH.ClockOut)
		})

		// ── Authenticated routes ───────────────────────────────────────────
		r.Group(func(r chi.Router) {
			r.Use(middleware.Auth(jwtSecret))

			// Identity + capabilities (drives UI nav/page gating).
			r.Get("/auth/me", authH.Me)

			// Per-user customizable dashboard layout (any authenticated user).
			// A user can keep several named layouts and switch the active one.
			dashH := handler.NewDashboardLayoutHandler(svc.DashboardLayouts, svc.DashboardProfiles)
			r.Get("/me/dashboard", dashH.Get)   // active layout
			r.Put("/me/dashboard", dashH.Save)  // save named layout (defaults to active)
			r.Get("/me/dashboards", dashH.List) // all named layouts
			r.Post("/me/dashboards/activate", dashH.Activate)
			r.Delete("/me/dashboards/{name}", dashH.Delete)

			// Self-service "My Profile" hub - own staff record (view + limited
			// self-edit), attendance history, personal rota. Leave lives at the
			// existing /leave-requests self-service endpoints.
			meH := adminHandler.NewMeHandler(svc.Me, svc.Audit)
			r.Get("/me/profile", meH.Profile)
			r.Put("/me/profile", meH.UpdateProfile)
			r.Get("/me/attendance", meH.Attendance)
			r.Get("/me/rota", meH.Rota)
			meNotifPrefsH := adminHandler.NewMeNotificationPrefsHandler(svc.NotifPrefs)
			r.Get("/me/notification-preferences", meNotifPrefsH.Get)
			r.Put("/me/notification-preferences", meNotifPrefsH.Update)

			// In-app notifications — strictly the CALLER's own rows (handler
			// scopes by JWT user id), so any authenticated user may read
			// theirs. Staff are notified by leave/daily-log approvals and see
			// the bell in the Staff Portal; gating this behind a management
			// permission locked them out of their own notifications.
			notifH := adminHandler.NewAdminNotificationHandler(svc.Notifications)
			r.Get("/admin/notifications", notifH.List)
			r.Post("/admin/notifications/read-all", notifH.MarkAllRead)
			r.Patch("/admin/notifications/{id}/read", notifH.MarkRead)

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

			// Staff self-service leave/holiday (apply / my requests / cancel).
			leaveSelfH := adminHandler.NewAdminLeaveHandler(svc.LeaveRequests, svc.Audit)
			r.Get("/leave-requests/me", leaveSelfH.Mine)
			r.Get("/leave-requests/balance", leaveSelfH.Balance)
			r.Post("/leave-requests", leaveSelfH.Apply)
			r.Patch("/leave-requests/{id}/cancel", leaveSelfH.Cancel)

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

			// Organisation (own tenant): any back-office role can read their org's
			// profile/branding; only the org's super-admin can edit it.
			orgSelfH := adminHandler.NewAdminOrganisationHandler(svc.Organisations, svc.Audit)
			r.Get("/admin/organisation", orgSelfH.GetCurrent)
			r.With(middleware.SuperAdminOnly).Put("/admin/organisation", orgSelfH.UpdateCurrent)

			// Store - products, categories, orders.
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
				adminEnquiryH := adminHandler.NewAdminEnquiryHandler(svc.Enquiries, svc.Auth, svc.Audit, svc.Children, svc.ChildRoomAssign, svc.Parents)
				r.Get("/admin/enquiries", adminEnquiryH.List)
				r.Get("/admin/enquiries/export", adminEnquiryH.Export)
				r.Post("/admin/enquiries", adminEnquiryH.Create)
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

			// Procurement - supply requests, catalogue, purchase orders.
			// Staff leave/holiday approvals (managers/HR).
			r.Group(func(r chi.Router) {
				r.Use(middleware.RequirePermission(models.PermLeaveApprove))
				leaveAdminH := adminHandler.NewAdminLeaveHandler(svc.LeaveRequests, svc.Audit)
				r.Get("/admin/leave-requests", leaveAdminH.List)
				r.Get("/admin/leave-requests/export", leaveAdminH.Export)
				r.Post("/admin/leave-requests", leaveAdminH.Apply) // manager files for a staff member (staff_id in body)
				r.Post("/admin/leave-requests/{id}/approve", leaveAdminH.Approve)
				r.Post("/admin/leave-requests/{id}/decline", leaveAdminH.Decline)
			})

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
				r.Post("/admin/purchase-carts/{id}/attachment", adminCartH.AddAttachment)
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

			// Nursery - children & rooms (foundation records).
			r.Group(func(r chi.Router) {
				r.Use(middleware.RequirePermission(models.PermChildrenManage))
				adminRoomH := adminHandler.NewAdminRoomHandler(svc.Rooms, svc.Audit)
				adminChildRoomH := adminHandler.NewAdminChildRoomAssignmentHandler(svc.ChildRoomAssign, svc.Audit)
				r.Get("/admin/rooms", adminRoomH.List)
				// Registered before /admin/rooms/{id} so "capacity" is never
				// captured as an id.
				r.Get("/admin/rooms/capacity", adminChildRoomH.CapacityByBranch)
				r.Get("/admin/rooms/{id}", adminRoomH.Get)
				r.Post("/admin/rooms", adminRoomH.Create)
				r.Put("/admin/rooms/{id}", adminRoomH.Update)
				r.Patch("/admin/rooms/{id}/status", adminRoomH.SetStatus)
				r.Delete("/admin/rooms/{id}", adminRoomH.Delete)

				// Child room allocations - room profile and child profile both
				// land on the same service (docs/rooms/room-allocation-design.md).
				r.Get("/admin/rooms/{id}/capacity", adminChildRoomH.Capacity)
				r.Get("/admin/rooms/{id}/children", adminChildRoomH.ListForRoom)
				r.Post("/admin/child-room-assignments", adminChildRoomH.Create)
				r.Patch("/admin/child-room-assignments/{id}", adminChildRoomH.End)
				r.Get("/admin/children/{id}/room-assignments", adminChildRoomH.ListForChild)
				r.Post("/admin/children/{id}/transfer-room", adminChildRoomH.Transfer)

				adminChildH := adminHandler.NewAdminChildHandler(svc.Children, svc.Audit)
				r.Get("/admin/children", adminChildH.List)
				r.Get("/admin/children/export", adminChildH.Export)
				r.Get("/admin/children/stats", adminChildH.Stats)
				r.Get("/admin/children/capacity-forecast", adminChildH.CapacityForecast)
				r.Get("/admin/children/{id}", adminChildH.Get)
				r.Post("/admin/children", adminChildH.Create)
				r.Put("/admin/children/{id}", adminChildH.Update)
				r.Patch("/admin/children/{id}/key-person", adminChildH.SetKeyPerson)
				r.Post("/admin/children/{id}/archive", adminChildH.Archive)
				r.Delete("/admin/children/{id}", adminChildH.Delete)
			})

			// Parents / guardians — canonical person records, child links and
			// portal invitations (permission parents.manage).
			r.Group(func(r chi.Router) {
				r.Use(middleware.RequirePermission(models.PermParentsManage))
				adminParentH := adminHandler.NewAdminParentHandler(svc.Parents, svc.Audit)
				r.Get("/admin/parents", adminParentH.List)
				r.Post("/admin/parents", adminParentH.Create)
				r.Get("/admin/parents/{id}", adminParentH.Get)
				r.Put("/admin/parents/{id}", adminParentH.Update)
				r.Delete("/admin/parents/{id}", adminParentH.Delete)
				r.Get("/admin/parents/{id}/children", adminParentH.ForParent)
				r.Post("/admin/parents/{id}/invite", adminParentH.Invite)
				r.Post("/admin/parents/{id}/portal-state", adminParentH.SetPortalState)
				r.Get("/admin/children/{id}/parents", adminParentH.ForChild)
				r.Post("/admin/children/{id}/parents", adminParentH.LinkChild)
				r.Put("/admin/parent-relationships/{id}", adminParentH.UpdateRelationship)
				r.Delete("/admin/parent-relationships/{id}", adminParentH.Unlink)
			})

			// Nursery - daily attendance register.
			r.Group(func(r chi.Router) {
				r.Use(middleware.RequirePermission(models.PermAttendanceManage))
				adminAttendanceH := adminHandler.NewAdminAttendanceHandler(svc.Attendance, svc.Audit)
				r.Get("/admin/attendance", adminAttendanceH.Register)
				r.Get("/admin/attendance/today", adminAttendanceH.Today)
				r.Post("/admin/attendance/check-in", adminAttendanceH.CheckIn)
				r.Post("/admin/attendance/check-out", adminAttendanceH.CheckOut)
				r.Patch("/admin/attendance/mark", adminAttendanceH.Mark)
			})

			// People / HR - staff records & staff attendance.
			r.Group(func(r chi.Router) {
				r.Use(middleware.RequirePermission(models.PermStaffManage))
				adminStaffH := adminHandler.NewAdminStaffHandler(svc.Staff, svc.Audit)
				r.Get("/admin/staff", adminStaffH.List)
				r.Get("/admin/staff/export", adminStaffH.Export)
				r.Get("/admin/staff/{id}", adminStaffH.Get)
				r.Get("/admin/staff/{id}/attendance-summary", func(w http.ResponseWriter, r *http.Request) {
					adminStaffH.AttendanceSummary(w, r, svc.StaffAttendance)
				})
				r.Post("/admin/staff", adminStaffH.Create)
				r.Put("/admin/staff/{id}", adminStaffH.Update)
				r.Delete("/admin/staff/{id}", adminStaffH.Delete)

				// Key children a staff member is the key person for (child data,
				// but gated under staff.manage as it's viewed from the staff profile).
				adminStaffKeyChildrenH := adminHandler.NewAdminChildHandler(svc.Children, svc.Audit)
				r.Get("/admin/staff/{id}/key-children", adminStaffKeyChildrenH.KeyChildren)

				// Staff room allocations - room profile and staff profile both
				// land on the same service (docs/rooms/room-allocation-design.md).
				adminStaffRoomH := adminHandler.NewAdminStaffRoomAssignmentHandler(svc.StaffRoomAssign, svc.Audit)
				r.Post("/admin/staff-room-assignments", adminStaffRoomH.Create)
				r.Patch("/admin/staff-room-assignments/{id}", adminStaffRoomH.Update)
				r.Get("/admin/staff/{id}/room-assignments", adminStaffRoomH.ListForStaff)
				r.Get("/admin/rooms/{id}/staff", adminStaffRoomH.ListForRoom)

				adminStaffAttH := adminHandler.NewAdminStaffAttendanceHandler(svc.StaffAttendance, svc.Audit)
				r.Get("/admin/staff-attendance", adminStaffAttH.Register)
				r.Get("/admin/staff-attendance/export", adminStaffAttH.Export)
				r.Get("/admin/staff-attendance/today", adminStaffAttH.Today)
				r.Get("/admin/staff-attendance/summary", adminStaffAttH.Summary)
				r.Post("/admin/staff-attendance/clock-in", adminStaffAttH.ClockIn)
				r.Post("/admin/staff-attendance/clock-out", adminStaffAttH.ClockOut)
				r.Patch("/admin/staff-attendance/mark", adminStaffAttH.Mark)
				r.Patch("/admin/staff-attendance/{id}/correct", adminStaffAttH.Correct)

				// Rota / shift scheduling.
				adminShiftH := adminHandler.NewAdminShiftHandler(svc.Shifts, svc.Audit)
				r.Get("/admin/shifts", adminShiftH.List)
				r.Post("/admin/shifts", adminShiftH.Create)
				r.Put("/admin/shifts/{id}", adminShiftH.Update)
				r.Delete("/admin/shifts/{id}", adminShiftH.Delete)

				// Kiosk device management + staff PIN provisioning.
				adminKioskH := adminHandler.NewAdminKioskHandler(svc.Kiosk, svc.Audit)
				r.Get("/admin/kiosk-devices", adminKioskH.ListDevices)
				r.Post("/admin/kiosk-devices", adminKioskH.CreateDevice)
				r.Patch("/admin/kiosk-devices/{id}", adminKioskH.SetActive)
				r.Delete("/admin/kiosk-devices/{id}", adminKioskH.DeleteDevice)
				r.Put("/admin/staff/{id}/pin", adminKioskH.SetStaffPIN)
			})

			// Organisation - Branch Management System (Branch as the central hub).
			r.Group(func(r chi.Router) {
				r.Use(middleware.RequirePermission(models.PermBranchesManage))
				adminBranchH := adminHandler.NewAdminBranchHandler(svc.Branches, svc.BranchOverview, svc.GBP, svc.Audit)
				r.Get("/admin/branches", adminBranchH.List)
				r.Get("/admin/branches/overview", adminBranchH.Overview)
				r.Get("/admin/branches/{slug}", adminBranchH.Get)
				r.Get("/admin/branches/{slug}/dashboard", adminBranchH.Dashboard)
				r.Get("/admin/branches/{slug}/reviews", adminBranchH.Reviews)
				r.Put("/admin/branches/{slug}", adminBranchH.Update) // scope-checked in handler
				// Lifecycle - super admin only.
				r.Group(func(r chi.Router) {
					r.Use(middleware.RequirePermission(models.PermBranchAdmin))
					r.Post("/admin/branches", adminBranchH.Create)
					r.Patch("/admin/branches/{slug}/managers", adminBranchH.SetManagers)
					r.Post("/admin/branches/{slug}/archive", adminBranchH.Archive)
				})
			})

			// Configurable lists (taxonomy) + term dates. Reads are open to any
				// back-office role so every picker (child sessions/allergy/dietary,
				// term-time) resolves; mutations are gated to branch management.
				func() {
					adminTaxonomyH := adminHandler.NewAdminTaxonomyHandler(svc.Taxonomy, svc.Audit)
					adminTermH := adminHandler.NewAdminTermHandler(svc.Terms, svc.Audit)
					adminFeeH := adminHandler.NewAdminFeeConfigHandler(svc.FeeConfig, svc.Audit)
					adminBranchTplH := adminHandler.NewAdminBranchTemplateHandler(svc.BranchTemplates, svc.Audit)
					adminEmailTplH := adminHandler.NewAdminEmailTemplateHandler(svc.EmailTemplates, svc.Audit)
					r.Get("/admin/taxonomy", adminTaxonomyH.List)
					r.Get("/admin/taxonomy/{id}", adminTaxonomyH.Get)
					r.Get("/admin/terms", adminTermH.List)
					r.Get("/admin/terms/{id}", adminTermH.Get)
					r.Get("/admin/fee-config", adminFeeH.List)
					r.Get("/admin/branch-templates", adminBranchTplH.List)
					r.Get("/admin/branch-templates/{id}", adminBranchTplH.Get)
					r.Get("/admin/email-templates", adminEmailTplH.List)
					r.Group(func(r chi.Router) {
						r.Use(middleware.RequirePermission(models.PermBranchesManage))
						r.Post("/admin/taxonomy", adminTaxonomyH.Create)
						r.Put("/admin/taxonomy/{id}", adminTaxonomyH.Update)
						r.Delete("/admin/taxonomy/{id}", adminTaxonomyH.Delete)
						r.Post("/admin/terms", adminTermH.Create)
						r.Put("/admin/terms/{id}", adminTermH.Update)
						r.Delete("/admin/terms/{id}", adminTermH.Delete)
						r.Put("/admin/fee-config/{branch}", adminFeeH.UpdateBranch)
						r.Delete("/admin/fee-config/{branch}", adminFeeH.Delete)
						r.Put("/admin/fee-config", adminFeeH.UpdateMeta)
						r.Post("/admin/branch-templates", adminBranchTplH.Create)
						r.Put("/admin/branch-templates/{id}", adminBranchTplH.Update)
						r.Delete("/admin/branch-templates/{id}", adminBranchTplH.Delete)
						r.Post("/admin/branch-templates/{id}/apply", adminBranchTplH.Apply)
						r.Post("/admin/branch-templates/from-branch", adminBranchTplH.CreateFromBranch)
						r.Put("/admin/email-templates/{key}", adminEmailTplH.Update)
						r.Delete("/admin/email-templates/{key}", adminEmailTplH.Delete)
					})
				}()

				// Nursery - daily records (observations, incidents, safeguarding, medication, meals).
			r.Group(func(r chi.Router) {
				r.Use(middleware.RequirePermission(models.PermDailyLogsManage))
				adminDailyH := adminHandler.NewAdminDailyRecordHandler(svc.DailyRecords, svc.Audit)
				r.Get("/admin/daily-records", adminDailyH.List)
				r.Get("/admin/daily-records/stats", adminDailyH.Stats)
				r.Get("/admin/daily-records/{id}", adminDailyH.Get)
				r.Post("/admin/daily-records", adminDailyH.Create)
				r.Put("/admin/daily-records/{id}", adminDailyH.Update)
				r.Patch("/admin/daily-records/{id}/status", adminDailyH.SetStatus)
				r.Delete("/admin/daily-records/{id}", adminDailyH.Delete)
				// Four-eyes approval - approvers only (managers/deputies/EYFS/admin).
				r.Group(func(r chi.Router) {
					r.Use(middleware.RequirePermission(models.PermDailyLogsApprove))
					r.Post("/admin/daily-records/{id}/approve", adminDailyH.Approve)
					r.Post("/admin/daily-records/{id}/reject", adminDailyH.Reject)
				})
			})

			// Organisations (tenants) - platform operator only (cross-tenant).
			r.Group(func(r chi.Router) {
				r.Use(middleware.PlatformOnly)
				orgH := adminHandler.NewAdminOrganisationHandler(svc.Organisations, svc.Audit)
				r.Get("/admin/organisations", orgH.List)
				r.Get("/admin/organisations/{id}", orgH.Get)
				r.Post("/admin/organisations", orgH.Create)
				r.Put("/admin/organisations/{id}", orgH.Update)
			})

			// Account management - super admin only.
			r.Group(func(r chi.Router) {
				r.Use(middleware.SuperAdminOnly)
				adminUserH := adminHandler.NewAdminUserHandler(svc.Auth, svc.Audit)
				r.Get("/admin/users", adminUserH.List)
				r.Post("/admin/users", adminUserH.Create)
				r.Put("/admin/users/{id}", adminUserH.Update)
				r.Post("/admin/users/{id}/reset-password", adminUserH.ResetPassword)
				r.Delete("/admin/users/{id}", adminUserH.Delete)

				// Roles & permissions builder - super admin only.
				adminRoleH := adminHandler.NewAdminRoleHandler(svc.Roles, svc.Audit)
				r.Get("/admin/roles", adminRoleH.List)
				r.Post("/admin/roles", adminRoleH.Create)
				r.Put("/admin/roles/{name}", adminRoleH.UpdatePermissions)
				r.Delete("/admin/roles/{name}", adminRoleH.Delete)

				// Org dashboard profiles / role defaults - super admin only.
				adminDashProfileH := adminHandler.NewAdminDashboardProfileHandler(svc.DashboardProfiles, svc.Audit)
				r.Get("/admin/dashboard-profiles", adminDashProfileH.List)
				r.Post("/admin/dashboard-profiles", adminDashProfileH.Save)
				r.Delete("/admin/dashboard-profiles/{slug}", adminDashProfileH.Delete)
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
