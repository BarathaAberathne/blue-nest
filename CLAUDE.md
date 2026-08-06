# Blue Nest Montessori — Project Guide (for AI agents & new devs)

Monorepo for the Blue Nest Montessori website + admin/operations system. The **North Star** is bigger than
one nursery: this is being built into a **scalable, enterprise-grade, AI-native multi-tenant Nursery
Management SaaS** — one codebase that runs many nursery **organisations**, each with unlimited branches,
with AI embedded throughout. Blue Nest is simply the first tenant. Keep auth/accounts separate from
employment/HR data so new modules attach cleanly.

## Platform vision & architecture (the standing design rules)
Before writing any code, ask: **"Would this still be right with hundreds of branches across multiple
organisations and AI embedded throughout?"** If no, redesign first. Concretely, every module MUST:
- **Be tenant-aware.** The hierarchy is **Organisation → Branch → Room**. Every operational entity carries
  `org_id` (and, where relevant, `branch_slug`) from day one. **No new feature ships without `org_id`.**
- **Follow the standard slice** (model → repository → service → handler → routes under `RequirePermission`
  → `response` envelope), business logic out of the UI, consistent APIs.
- **Be role-based + per-org extensible** in permissions (`models/permission.go` is already role→permission;
  custom roles become per-org).
- **Be configurable, not hardcoded** — branches, rooms, age groups, funding rules, term dates, branding all
  come from org/branch config, never literals.
- **Be AI-ready** — expose its reads as tools the AI service layer can call (see Phase A0), so any future AI
  feature can interact with the module without bespoke plumbing.

**Tenancy model (decided): shared database, row-level `org_id` discriminator.** One Mongo database; every
collection gains `org_id`; isolation is enforced **centrally** in the repository + policy layer (never
per-query discipline) — the request's org is resolved once (JWT `org_id` claim + subdomain/custom-domain)
into context, and every `Find/Create/Update` stamps + filters it. A `platform_super_admin` (the SaaS
operator) is the ONLY cross-org role; every tenant role — including today's org-wide `super_admin`/`admin`/
`director` — is pinned to its own organisation. A DB-per-tenant "enterprise isolation" tier is a later
premium option, not the default. This keeps cross-org platform analytics + AI simple at scale.

### Platform roadmap (phased; execute in order — tenancy precedes everything)
- **Phase T0 — Tenancy foundation — DELIVERED.** `models/organisation.go` (`Organisation`: slug, name,
  branding, plan, status, domains, settings) + repo/service/handler and platform-only routes
  (`/admin/organisations`, gated by `middleware.PlatformOnly`). `OrgID` (additive, omitempty) on every
  tenant-scoped model. **Central enforcement:** `repository.TenantCollection` wraps each collection and, from
  the org in request context, auto-filters every read/update/delete and stamps `org_id` on every insert —
  the repos changed only their collection type, not their query bodies (`counters`/`organisations` stay
  global; `users.FindByEmail` runs cross-org so login can resolve identity across tenants). `middleware.Auth`
  pins the request to the caller's org from the JWT `org_id` claim (`repository.WithOrg`); `platform_super_admin`
  runs cross-org (`WithCrossOrg`); `middleware.DefaultTenant(defaultOrgID)` pins public/unauthenticated
  requests to the default org (resolved at startup from `DEFAULT_ORG_SLUG`, default `blue-nest`). `policy`
  gains `IsPlatformOperator`; new role `RolePlatformSuperAdmin` = the only cross-tenant role. The one-shot
  tenancy migration (formerly `cmd/migratetenancy`) created the first Organisation and back-stamped `org_id`
  onto all existing rows (applied to every environment; command since **retired**). **Verified:** two-org
  isolation — each org's admin sees only its
  own branches/staff/children, cross-tenant fetch-by-id is 404 both ways, writes stamp the correct tenant,
  the public store serves the default tenant, and the existing Blue Nest app is intact.
- **Phase T1 — Org-scoped configuration & customisation — FUNCTIONALLY COMPLETE.** Delivered: **org self-service**
  (`GET/PUT /admin/organisation` for the caller's OWN org — name/branding/settings only; slug/plan/status/
  domains stay platform-controlled) with a settings surface at `/admin/organisation` (super-admin nav item:
  profile, branding + colour pickers, feature-flag toggles, live preview); **feature flags** on the org
  (`OrgSettings.Features` + `Organisation.HasFeature(name)` — the gate every future module/plan-tier uses);
  **tenant onboarding** — the platform `POST /admin/organisations` optionally provisions the new tenant's
  first super-admin in one call (`admin_email`/`admin_password`), created in the new org's context so it's
  usable + isolated immediately (verified: the provisioned admin logs in and sees 0 of another tenant's
  data). `RolePlatformSuperAdmin` added to `ManagementRoles` so the operator can sign into the admin shell.
  **Org branding wired into the live admin theme (delivered):** `AdminLayout` sets `--brand` (+ auto-contrast
  `--brand-ink` via perceived luminance) from the signed-in org's `branding.primary_color` on the
  `.admin-shell` root; a scoped, UNLAYERED CSS block in `styles/globals.css` re-points the `--adm-accent*`
  tokens at the brand and remaps the admin's hardcoded `teal-*` accent utilities to brand vars (derived shades
  via `color-mix`). It defaults to teal (no change unless an org sets a colour), is scoped to `.admin-shell`
  (public site + the Command Centre's own `.cc-*` palette untouched), and preserves semantic status colours
  (blue/green/amber/red). The logo gradient uses `branding.accent_color`. Unlayered is required because
  Tailwind utilities live in the `utilities` cascade layer, which outranks `@layer` rules by specificity.
  **Delivered across T1:** org-configurable **age groups** + session/allergy/dietary lists (taxonomy module),
  **funding rules** (fees module), **branch templates**, **email templates**, org branding wired into the
  live admin theme, and **per-org custom roles + permission sets** — the role→permission cache is org-scoped
  (`roleCacheKey{OrgID, Role}`; `SetRolePermissions(orgID,…)`/`HasPermission(orgID,…)`), the `roles`
  collection is tenant-scoped (`NewTenantCollection`), and a newly-onboarded org **seeds its built-in roles
  on create** (`organisationService.Create` calls `roleService.EnsureSeeded` for the new org, so its
  Permission Builder is populated immediately — startup seeding only covered orgs that existed then). Custom
  roles + edits in one tenant never leak into another (locked by `TestRolePermissionsAreOrgScoped` +
  `USER-TC-009`). **T1 is functionally complete.** **Note:** the `org_id` JWT claim means
  sessions issued before T0 lack it — users must re-login after deploy (or let tokens expire) to get
  org-scoped access + the org page.
- **Phase A0 — AI service layer (backend, tenant-scoped).** A first-class `internal/service/ai` (not a
  frontend afterthought) wrapping the LLM. Every AI call is org-scoped and can ONLY see its tenant's data.
  **Tool-use contract:** the AI calls the CMS's own service methods (children/staff/attendance/enquiries/
  finance) as tools, gated by the caller's permissions + org/branch scope — the concrete meaning of "every
  module designed so AI can interact with it". Move `/api/chat` behind this service; make it context-aware
  (role + org + current module), data-aware (via tools) and stateful (per-user conversation persistence).
- **Phase A1+ — AI capabilities (each a module on the A0 contract, none re-implementing data access):**
  role-based AI assistants; AI dashboards + business insights (occupancy forecasting, staffing recs,
  financial analysis); AI-generated EYFS observations + learning journeys; AI enquiry management; AI
  marketing/SEO automation; AI compliance + safeguarding monitoring; AI document generation, knowledge base,
  automation workflows. Prioritised per product need; all reuse A0's tool contract.

**Current status:** **multi-tenant (T0 delivered).** `Organisation` is the top-level tenant; every
tenant-scoped collection carries `org_id` and isolation is enforced centrally by the repository tenant
wrapper. Blue Nest is org 1. **Every new feature must carry `org_id`** — the tenant wrapper handles it
automatically as long as the model has the field and the repo uses `NewTenantCollection`. The AI chat
endpoint (`/api/chat`, per-page prompts) is still frontend-only, stateless and without tool access to CMS
data. **Next: Phase T1** (org-scoped config/branding/custom roles + onboarding), then **A0** (tenant-scoped
AI service layer with the module tool contract).

## Stack & layout
- **Backend:** Go (chi router, MongoDB driver) in `backend/`.
  - `internal/models` — structs (bson/json tags, `primitive.ObjectID` ids, timestamps).
  - `internal/repository` — Mongo data access (one type per collection).
  - `internal/service` — business logic.
  - `internal/handler` (+ `handler/admin`) — HTTP handlers.
  - `internal/routes/routes.go` — route registration + middleware groups.
  - `internal/middleware/auth.go` — JWT `Auth`, `RequireRole(...)`, `AdminOnly`, `SuperAdminOnly`.
  - `internal/server/server.go` — wires repos → services → routes.
  - `cmd/` — `api` (server), `seed`/`seedbranches`/`seedcatalogue`/`seedusers` (idempotent seeds), `makeadmin`.
  - `pkg/response` (Envelope `{data|error|message}`) and `pkg/validator` (`DecodeJSON`).
- **Frontend:** Next.js 16 App Router + React + TypeScript + Tailwind in `frontend/`.
  - `app/` routes; `app/admin/*` is the dashboard (wrapped in `components/layout/AdminLayout`).
  - `lib/api.ts` (typed fetch via `apiFetch`), `lib/auth.ts` (token/user storage),
    `lib/useAuthGuard.ts` (client route guard), `types/index.ts`.
- **DB:** MongoDB. **Email:** Resend HTTPS API in prod (DigitalOcean blocks SMTP); Gmail SMTP in dev.

## Roles & permissions
Role hierarchy (`backend/internal/models/user.go` `Role`; `frontend/types` `UserRole`):
`super_admin` > `admin` > `branch_manager` > `staff` > `customer`.
- `super_admin` — system owner; manages **all accounts + passwords** (the only role behind
  `SuperAdminOnly` / the `/admin/users` page). The seeded `DEFAULT_ADMIN_EMAIL` account is a super_admin.
- `admin`, `branch_manager` — management; full admin dashboard via `AdminOnly` (no account mgmt).
- `staff` — practitioners; sign in via the parent login but land in the **admin shell as a restricted
  "Staff Portal"** — `AdminLayout` shows them only **My Supply Requests** (`/admin/my-requests`) and
  redirects them away from any other `/admin/*` page. No management sections.
- `customer` — parents (store account at `/account`).
- **Specialist management roles** (Phase 4): `finance` (dashboard + procurement analytics/spend + audit),
  `admissions` (dashboard + enquiries CRM), `procurement` (dashboard + supply requests/POs/catalogue +
  suppliers + spend). Each enters the admin shell but `AdminLayout` shows only the sections its permissions
  allow and bounces it off any other `/admin/*` page.
- **`director`** (Managing Director) — executive oversight role with broad read/manage access (same reach
  as a general manager, minus account management). After login it lands on the **MD Command Centre**
  (`/admin/command-center`). **Command Centre access is restricted to `director` + `super_admin` only** —
  the sidebar item is role-gated in `AdminLayout` (`NavItem.roles`) and the page (which renders its own
  shell outside `AdminLayout`) is guarded by `command-center/AccessGuard.tsx`, which bounces any other role
  to `/admin/dashboard`. Assign the director role on `/admin/users`, or seed one via
  `DEFAULT_DIRECTOR_EMAIL/PASSWORD` (`make seed-users`).
Guards: `AdminOnly` = super_admin|admin|branch_manager; `ManagementOnly` = the outer gate on the admin route
group — admits **any back-office role** (every built-in management role + specialists + custom roles; i.e.
anything that isn't `customer` or `staff`), leaving per-resource `RequirePermission` to scope access. The
frontend mirrors this with `lib/auth.ts` `isManagementRole` (used by `AdminLayout` + login routing) — keep
the two in sync. `SuperAdminOnly` = super_admin. **Granular
permissions** (`models/permission.go`): a `Permission` set + a `role→[]Permission` map + `HasPermission`;
gate a route with `middleware.RequirePermission(models.PermX)` and a UI section by checking
`lib/usePermissions.ts` `has(perm)` (sourced from `GET /auth/me` → `{role, permissions}`). Add a role to a
route via `middleware.RequireRole("...")`. Login: `POST /auth/login` (parents/staff), `POST
/admin/auth/login` (management, incl. the specialists). After login, customers → `/account`, **staff →
`/admin/my-requests`** (Staff Portal), management → `/admin/dashboard`. There is **no social/OAuth login** (removed).

## How to add a backend entity (the standard pattern)
Mirror an existing module (e.g. `enquiries`, `orders`): model → repository (`Create`, `FindAll`
sorted, `FindByID`) → service (interface + impl) → handler (+ admin handler) → register routes in
`routes.go` under the right middleware group → wire repo+service in `server.go` (`routes.Services`).
Responses use `response.OK/Created/BadRequest/...`; request bodies via `validator.DecodeJSON`.

## Admin UI pattern (frontend)
New admin section = mirror **Orders/Inquiries**: a server `page.tsx` (metadata `robots:noindex`)
wrapping a `*Client.tsx` in `AdminLayout`; list page (table + filters/search + optional CSV
export) and a `[id]` detail page; add an item to the right section of `NAV_SECTIONS` in
`AdminLayout.tsx` (the sidebar is grouped: **Store** / **Supplies** / **Content** / **System**;
procurement lives under **Supplies** = Requests → Purchase Orders → Catalogue) and a KPI in
`app/admin/dashboard/DashboardClient.tsx`. Reuse `components/ui/{Badge,Card}`. Data via `lib/api.ts`
methods + `getAccessToken()`.

## Modules (current)
Store (products/categories/cart/checkout/orders), Blog, Branches, Contact/**Enquiries** (admissions
CRM at `/admin/inquiries`), **Users** (super-admin account mgmt), Online Play Area (4 games).
- **Store orders** (`models/order.go`, collection `orders`): lifecycle is **order-first** — the cart's
  in-app checkout form collects name/email/phone + optional nursery **branch** (default `n/a` = Not
  applicable) + optional child ref; `POST /checkout/session` creates a `pending`/`unpaid` order with
  that **snapshot**, then a Stripe Checkout Session (`client_reference_id`+metadata `order_id`; Stripe
  collects & validates delivery + **billing** address + phone; **no sensitive data in metadata**). The
  webhook (`handler/webhooks/stripe.go`, signature-verified) handles `checkout.session.completed` /
  `async_payment_succeeded` (reconciles billing+shipping+phone+customer onto the order via
  `SaveStripeDetails`, marks paid, decrements stock **once**, emails) and `async_payment_failed` /
  `payment_intent.payment_failed` (marks failed + restocks, never demotes a paid order). Four
  **idempotent** emails per paid order (own `*_email_sent_at` guard each): customer (no Stripe IDs),
  admin (`ORDER_ADMIN_EMAILS`), branch manager (resolved from the branch record's `Contact.Email` — no
  hard-coded staff addresses), BA (`ORDER_BA_EMAILS`); both configs fall back to `SMTP_ADMIN_TO`. Admin
  UI (`/admin/orders`): list has customer/nursery/payment columns + search + payment/branch/date
  filters; detail shows customer, nursery, billing + delivery, payment (incl. Stripe IDs), admin — with
  "Not recorded" for legacy orders (all new fields are additive/omitempty, so old orders load fine).
  **The human `ORD-YYYY-NNNNNN` number is minted only on the FIRST successful payment** (in
  `orderRepository.MarkPaid`, not `Create`) so abandoned/unpaid attempts never consume a sequence number
  (gap-free); the admin list (`orderService.ListAll`) **hides pre-payment drafts + failed attempts**
  (`payment_status` unpaid/failed) so only real paid orders show. The DB order is still created before
  Stripe (pending/unpaid, no ref) for reliable webhook reconciliation.
  **Stripe Dashboard must subscribe those 4 events** on the prod webhook. **Local testing needs
  `stripe listen --forward-to localhost:8080/api/v1/webhooks/stripe`** running — without it the webhook
  never reaches localhost, so orders stay pending + no emails send (prod posts to the public URL directly).
- **Enquiries / admissions CRM** (`models/enquiry.go`, collection `enquiries`): the public contact
  form (`POST /contact`) feeds an admissions pipeline. Status workflow (constants in `enquiry.go`,
  `NormalizeStatus` migrates legacy `new|read|responded` on read): `new → contacted →
  awaiting_reply → booked_visit → visit_completed → registered`, plus terminal `cancelled | lost |
  spam`. Each enquiry carries `notes[]`, an append-only `activity_log[]` (every status change, note,
  follow-up edit, assignment, reply, registration writes one entry, attributed to the JWT actor),
  `assigned_to`, `priority`, `follow_up_date`, `next_action`, a `registration` sub-doc (status
  `registered` syncs `registration.is_registered`), `source` and `updated_at`. Admin handlers
  (`handler/admin/enquiries.go`, `AdminOnly`) audit-log each mutation and return the fresh enquiry.
  Routes: `GET /admin/enquiries` (optional `branch|type|status|assigned_to|from|to|sort|dir|limit|skip`
  query filters — the UI filters client-side), `GET /admin/enquiries/{id}`, `GET .../stats`
  (KPI/chart payload), `GET .../assignees` (non-customer users for assignment), `PATCH .../{id}/status`,
  `POST .../{id}/notes`, `PATCH .../{id}/follow-up`, `PATCH .../{id}/assign`, `POST .../{id}/register`,
  `POST .../{id}/reply`. Frontend: list at `/admin/inquiries` (status-group tabs, branch/type/status/
  assignee/date-range/overdue filters, sortable columns, row indicators, CSV export), tabbed detail
  at `/admin/inquiries/[id]` (Overview/Message/Notes & Activity/Follow-up/Registration + sticky action
  panel), and a KPI dashboard at `/admin/inquiries/dashboard` (cards, **recharts** charts, conversion
  funnel, branch comparison). Shared UI: `components/ui/{Tabs,StatusBadge}`, helpers in `lib/enquiry.ts`.
- **Duplicate prevention & real-time sync (Enquiries/Children/Staff/Daily Logs, delivered):** backend —
  a submission with the same **email** as an existing still-in-pipeline enquiry (new/contacted/
  awaiting_reply/booked_visit/visit_completed — never registered/cancelled/lost/spam) within 24h merges
  into it as a note instead of creating a duplicate (`enquiryService.mergeIfDuplicate`, wired into both
  `Submit` and `CreateManual`/`POST /admin/enquiries` — the latter returns `200`+an accurate `merge_duplicate`
  audit entry rather than `201` when it merges); `POST /admin/children` rejects a second child with the same
  first+last name and DOB at the same branch (`childService.duplicateChild`, also enforced inside
  `EnsureFromEnquiry` so two enquiry threads for the same family link to one child); `POST
  /admin/daily-records` debounces an exact resubmit (same child+type+branch+date+title+meal_type) within 5s
  into the existing record (`dailyRecordService.recentDuplicate`) without blocking genuinely distinct
  same-day entries. Staff already had duplicate-email rejection (Phase QA pass, above). Frontend — Enquiries
  (list + detail), Children (list + detail), Staff (list + detail) and Daily Logs now poll via
  `lib/useAutoRefresh.ts` (30s interval + refire on tab focus/visibility, paused while hidden) so another
  staff member's change shows up without a manual reload; detail pages only refresh their read-only display
  state in the background (`hydrate(e, silent)` on the enquiry detail page) so an admin's in-progress edit
  form is never silently overwritten. `useAutoRefresh` was originally built for the attendance/dashboard/
  command-centre pages (see Staff Attendance module below) — this extends the same hook to these five.
- **Daily logs — per-type forms, single-log page, four-eyes approval, image attachments (delivered):**
  each `DailyRecord` type (observation/incident/safeguarding/medication/meal) has its own field set
  (`lib/dailyLog.ts` `typeFields`) surfaced by the shared **`components/admin/daily/DailyLogForm`** (type
  picker → per-type fields → multi-image upload via `POST /admin/uploads/image` → `attachments[]`). Children
  get an **Add daily log** button on their profile; every log opens as a **single page** at
  **`/admin/daily-log/{id}`** (per-type render + attachments gallery + approval panel). **Four-eyes
  approval**: every submission is created `approval_status=pending` (`submitted_by` recorded); it becomes the
  permanent record — shown on the child profile, counted in KPIs (`Stats` filters approved), and future
  parent-visible — only once a **different** approver (`daily_logs.approve`: managers/deputies/regional/EYFS
  lead/admin/director/super-admin) approves via `POST /admin/daily-records/{id}/approve` — the service rejects
  self-approval; `/reject` needs a reason. The daily-log list has Approved/Pending/Rejected tabs. Legacy
  records (no `approval_status`) read as approved so history stays visible. **Note:** adding a new permission
  now propagates to existing built-in DB roles automatically — `roleService.ensureSeededForOrg` additively
  reconciles built-in roles to the code defaults on boot (union; never removes admin-added perms).
- **Audit log** (`models/audit_log.go`, collection `audit_logs`): append-only record of admin
  mutations. `service.AuditService.Record(r, action, entityType, entityID, summary, details)` is
  called from admin handlers after a successful mutation (best-effort — never blocks the operation;
  pulls actor id/email/role from the JWT context + client IP). Viewable by **all** management roles
  at `/admin/activity` (`GET /admin/audit-logs`, filters: `actor`, `entity_type`, `action`, `limit`).
- **Order/supply requests** (`models/order_request.go`, collection `order_requests`): staff submit
  a list of items they need at **`/admin/my-requests`** (inside the admin shell — see the staff-portal
  note under Roles). Each item line carries `item_name, supplier (Gompels|Amazon|Other), qty, notes`
  plus optional `code` + `catalogue_item_id` when picked from the catalogue. The staff picker is a
  **grouped product → variant dropdown** (variant = Colour/Size/Type, resolved to a specific Gompels
  code) that's **also searchable by product code** (`SearchSelect` matches `label` + `keywords`, where
  keywords = the product's variant codes), with an "Other — type manually" free-text fallback. Staff
  can also **cancel** their own pending requests (`PATCH /order-requests/{id}/cancel`). The request
  carries `expected_delivery_date` + `delivered_at`, set from its covering purchase order, so the
  staff list shows **status + expected/delivered dates in-app** (never prices). Management reviews the
  aggregated list at `/admin/order-requests` (labelled **Supply Requests**), filters, exports the
  buy-list CSV (incl. the code column), and moves status pending→ordered→received (or cancelled). A
  guided **New order** wizard there reviews the aggregated items per supplier then generates + places.
  Staff routes under `Auth` + `RequireRole(super_admin,admin,branch_manager,staff)` (customers
  excluded); admin routes under `AdminOnly`.
- **Catalogue** (`models/catalogue_item.go`, collection `catalogue_items`): known products with
  per-supplier offers (`{supplier, code/ASIN, pack_size, price, price_per_unit}`). Optional
  `base_name` + `option` group variants of one product (each variant is its own doc with its own
  code, so the per-supplier sourcing engine is unaffected; the UI groups by `base_name` at render).
  It's the cache + curation layer the sourcing engine writes to. Admin CRUD at `/admin/catalogue`
  (`AdminOnly`); staff read-only at `GET /catalogue` (powers the request picker).
  - **Seeding from real Gompels orders** (`cmd/seedcatalogue`, idempotent): drop Gompels order CSVs
    (`Code,Description,Quantity,Unit Price,Net Price,VAT,Gross Price`) into
    `backend/cmd/seedcatalogue/orders/` (committed + `//go:embed`-ed), then `make seed-catalogue`
    (part of `make seed-all`). It dedupes by code, splits the `- Colour/Size/Type:` suffix into
    `base_name`/`option`, parses pack size + gross unit price, and **upserts by name** (never drops
    the collection, so sourced/curated items survive). Adding new orders = add a CSV + re-run.
- **Order creation tool** (`models/purchase_cart.go`, collection `purchase_carts`): admin selects
  supply requests on `/admin/order-requests` and runs the guided **New order** wizard (the *only*
  generate entry point — the old "Generate cart" / "Generate & push" quick buttons were removed). The
  wizard previews the aggregated items, then **Generate orders** runs the **sourcing engine**
  (`internal/platform/sourcing`) — best & cheapest offer per item (catalogue cache first, then live
  supplier search) — aggregating + splitting by supplier into draft carts at `/admin/purchase-carts`
  (**Purchase Orders**), and **auto-hands the Gompels order to the browser extension** (opens the
  Gompels cart and fills it automatically — see below). **There is no email path**: ordering goes
  through the extension into the logged-in Gompels basket, where the admin reviews & pays (or uses
  Gompels' own **E-Mail Basket** — the end goal). The PO detail page is a **lifecycle stepper**:
  **Review** (edit lines) → **Place order** (**Send to Gompels cart** — re-push via the extension) →
  **Track** (set `supplier_order_ref` + `expected_delivery_date`; propagated to the covered staff
  requests) → **Receive** (per-line `qty_received`). Status flow `draft → ordered →
  partially_received → received` (legacy `sent` reads as `ordered`; `PurchaseCart.IsPlaced()` gates
  edits & post-placement actions). Placing flips covered requests to `ordered`; full receipt flips
  them to `received` + sets `delivered_at`. Lines carry `qty_received`; the list shows status filter +
  expected/received columns (overdue flagged).
  Routes (`AdminOnly`): `POST /admin/purchase-carts/generate`, `GET /admin/purchase-carts[/{id}]`,
  `PUT /admin/purchase-carts/{id}`, `POST /admin/purchase-carts/{id}/exported` (extension callback),
  `PATCH /admin/purchase-carts/{id}/fulfillment`, `POST /admin/purchase-carts/{id}/receive`. Sourcing adapters:
  `GompelsAdapter` (HTML scrape, best-effort, off unless `GOMPELS_SEARCH_ENABLED=true`),
  `AmazonAdapter` (stub, gated by `AMAZON_BUSINESS_ENABLED`; Amazon Business API is a later phase).
  Env: `GOMPELS_SEARCH_ENABLED`, `GOMPELS_SEARCH_URL`, `AMAZON_BUSINESS_ENABLED` (the old
  `GOMPELS_ORDER_EMAIL` / `SUPPLIES_ORDER_EMAIL` are unused now that placement is extension-only).
  - **Send to Gompels cart (browser extension)** (`gompels-extension/`, MV3, loaded unpacked): the
    **New order** wizard (or the PO detail **Send to Gompels cart** button) `postMessage`s the
    `{code, qty, name}` lines to the extension (handoff is **ACK-gated** + PING/PONG detection, so the
    UI only reports success when the extension actually received it). The extension **auto-fills by
    default** as soon as the Gompels tab opens (toggle off via the popup's **Auto-fill** checkbox; the
    popup's **Fill cart now** re-runs it manually, and a **Clear Gompels cart** button empties the
    basket without filling — `BLUENEST_CLEAR_CART` → `clearBasketOnly`). Filling
    **first empties the Gompels basket** — **server-side via `fetch`** from the Quick Order page
    (reads `/checkout/cart/`, POSTs each item's Magento delete action with the session cookie +
    `form_key`), then reloads once — so re-runs never collide with leftovers. Clearing is best-effort
    and **never blocks the fill** (if it can't clear, the fill's increase-qty path is the fallback).
    Then it fills the admin's *logged-in* cart on `/quick-add.html`: **by code** when present
    (`input[name="model[]"]` auto-resolves), else by **searching the description and picking the
    cheapest relevant match** (jQuery-UI autocomplete `ul.ui-autocomplete.quickadd`, char-by-char
    typing); qty via `td.units input[name="quantity"]`. Fill engine handles edge cases: a product
    **already in the basket → increases** qty (reads existing + adds); an **unavailable code → falls
    back to a description search** (substituted); **no match → not_found**, reported & skipped. On done
    the **background worker** POSTs per-line results (+ a best-effort `supplier_order_ref`) to
    `POST /admin/purchase-carts/{id}/exported` (admin token read from our `localStorage`), which marks
    the cart **ordered** + flips covered requests to `ordered` + audit-logs; then it redirects to
    `/checkout/cart/` (has **E-Mail Basket** — the admin reviews & pays or e-mails the basket there).
    The **popup** shows a per-line progress list (chips: added / substituted / not found) + a summary
    bar. The PO **Track** step shows the fill results; for search-resolved lines an **Accept** saves the
    discovered code via `POST /admin/catalogue/learn` (`UpsertByName`) — the catalogue **self-improves**
    (gated by Accept). Stops at a filled cart — no payment automation, no stored Gompels creds.
    Selectors live in `content-gompels.js` (`SEL`); see `gompels-extension/README.md`.
  - **Reorder & standing-order templates** (`models/order_template.go`, collection `order_templates`,
    shared org-wide): on `/admin/my-requests` staff **Save as template**, **Use** a template, or
    **Reorder** a past request. Routes `GET/POST/DELETE /order-templates` (staff+management). The admin
    **New order** wizard on `/admin/order-requests` generates the cart + auto-hands it to the extension.

- **MD Command Centre** (`app/admin/command-center/`, frontend-only): a self-contained **full-screen
  executive command centre** for the Managing Director — a dark-navy + champagne-gold + electric-blue
  "mission control" dashboard that renders its **own edge-to-edge shell** (deliberately NOT wrapped in
  `AdminLayout`) at `/admin/command-center`. The layout is **fluid and fills 100vw × 100vh** (fixed
  left nav rail + wide scrollable centre + fixed right insight rail — `.cc-body` + `.cc-col-scroll`), no
  centred narrow container. All figures are **static mock data** (`data.ts`) — none of it (children,
  attendance, finance, sentiment, compliance, staffing, activity) is backend-wired yet. No new npm deps:
  every chart (financial donut, admission funnel, attendance bars, sentiment spark, radar dials, ring
  gauges, source donut, branch building line-art, centrepiece rings) is hand-rolled SVG in `widgets.tsx`,
  the HUD line-icons (Blue Nest "Icon Pack v1.0" — neon `#36A9FF` electric blue with `#FFC857` gold
  accents, lucide-compatible API) live in `icons.tsx`, and all motion (logo glow-pulse, rotating rings,
  radar sweep, sonar pings, flowing connector dashes, AI waveform, live clock) is CSS keyframes. The real
  Blue Nest logo PNG (`/logo/bluenest-logo.png`) glows via `drop-shadow` in the topbar, centrepiece and
  system-health radar. All styling is scoped under `.cc-root` in `command-center.css` (palette as `--cc-*`
  vars: bg `#071321`, panel `#0E223D`, primary `#36A9FF`, accent `#D6B36A`, success `#35D07F`, warning
  `#FFC857`, error `#FF5C73`) so nothing leaks into the light admin theme; `body:has(.cc-root),
  body:has(.cc-os)` darkens the page. **Stage-1 executive-OS rebuild** (`CommandCenterClient.tsx` renders the
  `.cc-os` shell; supporting parts in `os/`): a four-region desktop-app layout — **Header** (logo · school
  name · MISSION CONTROL chip · global ⌘K search · clock · notifications/messages · profile) · **collapsible
  navigation Dock** (72px collapsed → 240px on hover / pin, framer-motion, macOS-style; Dashboard/Branches/
  Children/Staff/Admissions/Finance/Attendance/Communication/Reports/Settings) · **AI Workspace** (centre,
  the primary surface): an **executive KPI bar** (Children/Occupancy/Attendance/Revenue/Outstanding/
  Safeguarding/Satisfaction/Staff) over three columns — left **Intelligence Rail** (exec summary · health
  score · branch status · risks · deadlines), centre **Core** — **AI tabs** (Mission-Control/Operations/
  Finance/Admissions/People/Ofsted/Analytics) that swap the workspace view (`os/AITabs.tsx`: each tab is a
  dedicated dashboard — Operations = today's ops + branch table; Finance = revenue mix/P&L/budget-vs-actual
  + per-branch; Admissions = live funnel + sources; People = staff status + gauges; Ofsted = compliance +
  SEF + actions; Analytics = forecast/trends/gauges). Mission-Control shows the **radar-as-organisation-
  health** rendered with **React Flow** (`@xyflow/react`) as a branch network — central Blue Nest radar node
  + 5 branch nodes with animated data edges + hover-expand live stats (bottom-row popovers open upward so
  they aren't clipped). A ChatGPT-style **conversational AI** (contextual to the active tab; turns "add
  task …" prompts into tasks) sits below every tab. Right **AI Rail** (unified notifications · approvals · safeguarding · tasks · activity, each with
  priority/branch/time/quick-action) · **Executive Financial Sidebar** (Revenue/CashFlow/Outstanding/Funding
  /Budget/Forecast donut + trend · Calendar · System Health) · full-width **Operational Workspace** strip
  — a **modular workspace** (`os/OpsWorkspace.tsx`, Stage 2): panels (**Tasks** · Attendance · Admissions ·
  Parent Sentiment · Revenue · Occupancy · Calendar · Enquiry Sources · Finance) are **drag-reordered**
  (framer-motion `Reorder`), **resized** (S/M/L column span), shown/hidden/added, the strip height is drag-
  resizable, and the whole layout **saves to localStorage** (`cc-ops-layout-v2`) — Edit-mode toolbar with
  Add/Reset/Save/Done. No new deps (framer-motion only). A **Tasks** widget (`os/TasksPanel.tsx`) lets the
  MD create tasks **manually or via AI** (the ✨ button pulls from `AI_COMMAND.recommendations`; the AI chat
  turns "add task …"/"remind me to …" into tasks). Tasks live in a shared store (`os/tasks.ts`, localStorage
  `cc-tasks-v1`, reactive `useTasks()`), so the widget, the AI conversation and the **placeholder Kanban
  board** at `/admin/command-center/board` (`os/BoardClient.tsx` — 3 columns To Do/In Progress/Done, clearly
  labelled "PREVIEW · FULL BOARD COMING SOON") all stay in sync. A real backend-backed Kanban (assignees,
  due dates, drag-drop, per-branch swimlanes) is the planned follow-up.
  A global **command palette** (`cmdk`, ⌘K / click search) is the AI-navigation layer — "Open Harrow", "Show
  today's absences", etc. route into the CMS. Motion uses the already-installed **framer-motion**; new deps
  are only **`cmdk`** + **`@xyflow/react`** (Tailwind stays v3). Data: `os/osdata.ts` (dock/KPI-bar/rails/
  tabs/prompts/palette) + `data.ts` (`AI_COMMAND`, `BRANCH_METRICS`, finance, calendar). The old
  widget-grid composition (bottom AI Assistant, Live Activity, Parent Comms, occupancy heatmap, enquiry-
  sources, performance gauges, staff/children/compliance, static branch overview) was **removed/absorbed**.
  Widgets/nav/palette are wired into the CMS via `router.push` (dock hrefs + `PALETTE_COMMANDS` in `osdata.ts`;
  modules without a page fall back to the closest one). The
  `director` role (above) is its intended audience. **Multiple modules are live-wired** through `live.ts`
  hooks (each fetches with the signed-in token and **falls back to the static mock** when there's no token or
  the request fails, so the page still renders for an anonymous demo): `useEnquiryPipeline`
  (`/admin/enquiries/stats` → funnel/conversion + Admission-Pipeline tiles, shown with a **● Live** tag),
  `useChildrenStats` (`/admin/children/stats` → children total + occupancy), `useAttendanceToday`
  (`/admin/attendance/today` → child attendance % + late pickups), `useStaffStats`
  (`/admin/staff-attendance/today` → staff present/leave/sick/late/agency + per-branch), and `useDailyStats`
  (safeguarding/meals/medication/incidents). `useBranchMetrics` overlays these onto the per-branch table
  (occupancy, attendance today, staff headcount), and `staffPresentByBranch` feeds the real per-branch
  staff-present + staff:child ratio. The KPI bar, Operations/People/Ofsted/Analytics tabs and the branch
  radar read these live values; the Analytics performance gauges use live occupancy + attendance where a
  backend exists. **Still mock (no backend source yet):** finance/revenue, parent sentiment, workforce
  happiness/retention, and the AI-rail/risks staffing items. Keep staff/attendance KPI definitions
  consistent with the backend single source of truth (`models.IsWorking`/`IsAway`).

- **Staff Attendance / Kiosk** (HR module, being built in phases — **Phase A DELIVERED**): the
  authoritative source of staff working hours for payroll. Extends the existing `StaffAttendanceRecord`
  (`models/staff_attendance.go`) additively — breaks[], capture context (source kiosk|manual|import,
  device_id, ip), computed worked/break/late minutes, missing_clockout, shift_id (Phase B), append-only
  `corrections[]`. **Entrance-tablet kiosk** (`app/kiosk/`, full-screen, outside AdminLayout): staff search
  their name + enter a **PIN** to clock in/out. Isolated `/kiosk` API (device-token auth via `X-Kiosk-Token`
  header + `middleware.KioskAuth`, rate-limited via `middleware.RateLimit`) exposes ONLY session/search/
  clock-in/clock-out within the device's branch — never the CMS. `KioskService` (`service/kiosk.go`)
  authenticates devices (bcrypt token hash), searches staff, and clocks via the shared
  `StaffAttendanceService.ClockIn/ClockOut(cc ClockContext)` so kiosk + admin write identical records.
  Double-clock prevention + PIN check server-side; offline queue + auto-sync client-side. New: `KioskDevice`
  (`kiosk_devices`, per-branch tablets, tokens shown once), `Staff.PINHash` (bcrypt, `has_pin` computed).
  Admin: **HR** sidebar group (Staff · Attendance · Attendance Devices); device management at
  `/admin/attendance-devices` (create/list/toggle/delete, `staff.manage`); per-staff PIN on the staff detail
  page. **Phase B** = Rota scheduling (staff→room/timeslot/day) + shift
  matching (real overtime/early-departure); **C** = manager/admin dashboards + attendance table + manual
  corrections; **D** = Payroll summary from attendance; **E** = reports (CSV/Excel/PDF) + notifications.
  Future-ready: QR/NFC/biometric/GPS attach to the same clock request + PIN abstraction.
  **Phase B DELIVERED** — **Rota scheduling**: new `Shift` (`shifts` collection, staff→branch/room/date/
  start/end) + repo/service/admin CRUD (`/admin/shifts`, `staff.manage`). Weekly **rota planner** at
  `/admin/rota` (HR nav): branch + week picker, staff rows × 7 days, click a cell to assign/edit/delete a
  shift (room dropdown + start/end + presets). **Shift matching** wired into `StaffAttendanceService`:
  clock-in computes late_minutes vs `shift.start` (falls back to the 09:00 threshold when unrostered),
  clock-out computes overtime_minutes / early_departure_minutes vs `shift.end`, and stores `shift_id` on
  the record — so those figures are now real.
  **Phase C DELIVERED** — **Attendance hub** at `/admin/staff-attendance`: date + branch picker, 8-tile KPI
  strip (`GET /admin/staff-attendance/summary` → currently-in / clocked-out / absent / on-leave / late /
  overtime / missing-clock-outs / attendance% + avg arrival, with a per-branch breakdown for the all-branch
  view), searchable/status-filterable register (position + room resolved from the staff record, worked
  hours, late, overtime), and **audited manual corrections** (`PATCH …/{id}/correct`: append-only
  `corrections[]` per changed field + recomputed minutes; **create-on-correct** materialises a record when a
  day has none, so managers can backfill an "expected" staff member the kiosk never captured).
  **Stabilisation pass:** the **rota** is now **grouped by classroom** — rostered staff sit under their
  assigned room, roomless management/office staff are hidden behind a **Show all staff** toggle, and an **Add
  cover** action rosters an extra person for one day (any staff member, or a free-text **external** visitor
  — `Shift.External`/`ShiftRequest{External,StaffName,BranchSlug}`, no staff record, never matches
  attendance). **Branch data isolation is enforced server-side**: `policy.EffectiveBranch` (list/summary
  endpoints pin a branch-scoped caller to one of their branches — never the org-wide "all" view) +
  `policy.AllowedOrNil`/`branchAllowed` guards on every mutation (staff, staff-attendance clock/mark/correct,
  shifts, kiosk devices, staff PIN) so a branch/deputy/regional manager can neither see nor act on another
  branch's data. Org-wide roles (super_admin/admin/director, `isOrgWideRole`) keep the all-branches view; the
  UI hides "All branches" + pins the selector for scoped users. Rota + attendance + devices now source their
  branch dropdown from the scoped `GET /admin/branches`, not the public list.
  **Leave & absence taxonomy (delivered):** attendance statuses now distinguish the real leave kinds —
  `leave` (annual), `sick` (own sickness), `dependant_sick` (staff's own child/dependant sick), `unpaid_leave`
  (no-pay), `maternity`, and `absent` (= **unauthorised** absence) — plus the work-away set (`training`/
  `meeting`/`remote`). `models.AwayCategory` is the single classifier; `models.IsAway` is unchanged (all leave
  kinds are accounted-for away, never counted absent). The attendance-hub `summary` (`AttendanceDaySummary`),
  the staff dashboard `StaffStats`, and the per-staff `StaffAbsenceSummary` all now break these out per type
  (the hub keeps `on_leave` as the total-away and renders a **Leave & absence breakdown** strip beneath the
  KPI tiles), so sickness/maternity are never hidden inside a single "on leave" number. **Child attendance
  `absent` is now the residual `expected − present`** (`attendanceService.TodayStats`), so a child who never
  checks in is counted absent — matching the staff summary — instead of only children with an explicit
  absent/sick/holiday record. Keep any new KPI consistent with `models.IsWorking`/`IsAway`/`AwayCategory`.

- **Room allocation (canonical model, delivered on `feature/room-allocation`):** there is exactly **one**
  source of truth for who is in which room — the effective-dated assignment collections
  `staff_room_assignments` / `child_room_assignments` (`models.room_assignment.go`, repo/service/handler under
  `RequirePermission(staff.manage|children.manage)`). The old stored `staff.room_id`/`child.room_id` scalars
  were **removed**; `room_id`/`room_name` remain on API responses only as a **computed projection**
  (`bson:"-"`, resolved live from the active assignment at read time, like `Child.KeyPersonName`) consumed by
  the rota grouping, attendance/kiosk registers, capacity-forecast, and the child/staff list+detail UI.
  `PUT /admin/staff|children/{id}` **no longer accept `room_id`** (dropped from the DTO; `DisallowUnknownFields`
  rejects it) — allocation goes only through the assignment endpoints, and the create screens issue a second
  canonical `POST …-room-assignments` call when a room is picked (with **compensating rollback**: if the
  allocation is rejected on age/capacity, the just-created child/staff is deleted so the create stays atomic).
  Rooms gained `min_age_months`/`max_age_months`/`status`; allocation enforces same-branch + active + capacity
  + age, each overridable only with a stored `override_reason` (audit-logged). Transfers close the old row and
  open a new one (future-dated → `scheduled`, lazily activated). The one-shot room-allocation migration
  (formerly `cmd/migrateroomassignments`) mapped legacy `room_id` scalars into the assignment collections;
  it is complete (local-only, never needed on prod) and the command is now **retired**. Full design in `docs/rooms/*` and the
  consolidation rationale in `docs/architecture/duplicate-implementation-audit.md`.

- **Configurable taxonomy (lists) + term-time (delivered):** the "configurable, not hardcoded" rule is now
  a real module. `taxonomy_terms` (`models/taxonomy.go`, tenant-scoped, optional `branch_slug` — ""=org-wide
  default) holds curated lookup lists by `category`: `session_type` (with start/end times — the weekly
  session slots), `allergy_type`, `dietary_label`, and **`age_group`** (carries `min_age_months`/
  `max_age_months`; 0 is meaningful — min 0 = from birth, max 0 = unbounded top band, so those two fields are
  NOT `omitempty` in bson or json) (extend `ValidTaxonomyCategory` for more). Admin CRUD at
  **`/admin/lists`** (`branches.manage`); reads open to any back-office role so pickers resolve; a public
  `GET /taxonomy` feeds the application form. `cmd/seedtaxonomy` (`make seed-taxonomy`, idempotent, baked
  into the image) seeds org-wide defaults per org — the session codes (`am/pm/full/school`) **match existing
  `child.sessions` values** so they keep resolving. Every session picker (admin child create + detail edit,
  public application form) and the child **allergy/dietary tag chips** read from this list, not hardcoded
  arrays; `child.allergy_tags[]`/`dietary_tags[]` are additive (free-text `allergies`/`dietary_reqs` kept as
  notes). **Age groups (T1, delivered):** the `age_group` list is the single source of occupancy age bands.
  `childService.Stats` buckets active children into the configured bands by age-in-months (falls back to the
  built-in Under 2 / 2–3 / 3+ when none are configured, so figures are unchanged until an org customises them);
  the `/admin/rooms` form has an age-group quick-fill that populates a room's `min/max_age_months` + label.
  `cmd/seedtaxonomy` seeds the three defaults to reproduce the previous hardcoded buckets exactly. Two real
  bugs surfaced while adding the CRUD test (`TAX-TC-004`) and were fixed: taxonomy `Update` re-mapped a
  hardcoded `$set` that silently **omitted new fields** (so age bounds never saved), and `omitempty` on the
  age-bound tags dropped a meaningful `0` on write. Frontend: `lib/useTaxonomy.ts` (`useTaxonomy`,
  `sessionOptions`, fallback). **Term-time**: `terms`
  (`models/term.go`, per-branch date ranges) with admin CRUD at **`/admin/terms`**, plus a
  `staff.term_time_only` flag; the staff-attendance roster is **term-aware** — a term-time-only staff member
  with no record is excluded from the expected roster (never counted absent) outside their branch's term
  dates (`staffAttendanceService.termActive`/`expectedToday`; when no terms exist, nobody is excluded). The
  public application-form session picker also reads the configurable list (org-wide). **Admin list ordering**:
  `lib/group.ts` (`sortByName`/`groupByBranch`) — lists sort alphabetically, grouped by branch; the
  children + staff tables render per-branch section headers (the same helper extends to the remaining lists).

- **Fees & funding config (T1, delivered):** the public fee calculator's per-branch rates are no longer a
  hardcoded frontend file. `fee_configs` (`models/fee_config.go`, tenant-scoped: one doc per branch keyed by
  `branch_slug`, plus a ""-branch doc holding the org-wide `Meta` = extra-hour/swap/late-fee + disclaimer)
  mirrors the old `fee-data.json` shape (`ageGroups[ageKey][session]{daily,weekly}`, `earlyBird`,
  `stdFunded{below3,above3}`), so `computeQuote` is unchanged. Public `GET /fee-config` returns the bundle
  (`{branches, meta}`, keyed by slug, pinned to the default tenant); admin `GET /admin/fee-config` +
  `PUT /admin/fee-config/{branch}` + `PUT /admin/fee-config` (meta) under `branches.manage`, edited at
  **`/admin/fees`** (branch tabs → age-group×session rate grid + early-bird + funded top-up + ancillary
  pricing). `cmd/seedfees` (`make seed-fees`, idempotent `$setOnInsert`, embeds the canonical schedule,
  maps display keys → slugs e.g. "pinner green"→"pinner-green"). `FeeCalculatorCard` fetches the bundle on
  mount and **falls back to the still-bundled `lib/fee-data.json`** if the request fails, so the public
  calculator never breaks. Tests: `SUI-FEES-001` (public bundle + admin round-trip on a throwaway branch).

- **Branch templates (T1, delivered):** reusable branch-setup presets so a new branch's rooms are created in
  one step instead of by hand. `branch_templates` (`models/branch_template.go`, tenant-scoped: name +
  description + `rooms[]` presets {name/code/age_range/min-max_age_months/capacity/staff_ratio}) with
  repo/service/handler admin CRUD at **`/admin/branch-templates`** (`branches.manage`, Organisation nav).
  `POST .../{id}/apply` `{branch_slug}` creates the template's rooms on the target branch (skips rooms whose
  name already exists — non-destructive, re-runnable); `POST .../from-branch` captures an existing branch's
  rooms into a new template. The service reuses the shared `RoomService`/`BranchService` (hoisted in
  `server.go`), so room validation/guards apply. Tests: `SUI-BRANCHTPL-001` (create → apply to a fresh test
  branch → rooms verified).

- **Email templates (T1, delivered):** per-org editable transactional-email copy, **opt-in**: a template
  only overrides the built-in default once an admin customises it, so existing emails are unchanged.
  `email_templates` (`models/email_template.go`, tenant-scoped, keyed by `key`; catalogue =
  `EmailTemplateCatalogue`, currently `enquiry_acknowledgement`) stores an editable `subject` + `body` (the
  message text with `{{placeholders}}`; the service wraps it in the branded Blue Nest shell so admins never
  edit raw layout). `emailTemplateService.Render(ctx, key, vars)` substitutes placeholders (HTML-escaping
  values into the body to prevent injection) and returns `ok=false` when no custom template exists.
  `enquiryService` resolves the acknowledgement email **synchronously before the async send goroutine**
  (request ctx is still valid for the org-scoped lookup) and falls back to the hardcoded copy. Admin CRUD at
  **`/admin/email-templates`** (`branches.manage`, Organisation nav): pick a template, edit subject/body with
  a variable reference, or revert to default. Tests: `SUI-EMAILTPL-001` (customise + revert round-trip).

- **Leave / holiday requests (HR module, Phases 1–4 DELIVERED):** staff apply for time off and a
  **different** manager (four-eyes) approves or declines it. `models/leave_request.go`
  (`LeaveRequest`: staff_id/branch/type/start/end/days/reason/status + reviewer + timestamps; statuses
  `pending → approved | declined | cancelled`; `LeaveType` values are identical to the attendance leave
  statuses — `leave`(annual)/`unpaid_leave`/`maternity`/`dependant_sick`/`sick` — so approval maps 1:1)
  → repo (`leave_requests`, tenant-scoped) → `service.LeaveRequestService` (Apply/ListMine/List/Cancel/
  Approve/Decline) → `handler/admin/leave_requests.go` → routes. **On approval** the booked **weekdays**
  (Mon–Fri; `models.Weekdays`/`CountWeekdays`) are written to the staff-attendance register via
  `StaffAttendanceService.Mark` (best-effort), so approved leave flows straight into the register/roster/
  KPIs. **Four-eyes**: the reviewer's user id must differ from the applicant's (`RequestedByID`); the
  applicant resolves to their `Staff` record via `Staff.UserID` (self-service) or a manager may file with
  an explicit `staff_id`. **Notifications** reuse the in-app module (apply → approvers with `leave.approve`
  in the branch; approve/decline → the applicant). New permission `PermLeaveApprove` (`leave.approve`),
  granted to the management/HR roles (added to `AllPermissions` too, so it reconciles onto built-in DB
  roles on boot — see the daily-log role-reconcile note). Routes: staff self-service under the staff group
  (`GET /leave-requests/me`, `POST /leave-requests`, `PATCH /leave-requests/{id}/cancel`); management under
  `RequirePermission(leave.approve)` (`GET /admin/leave-requests` branch-scoped via `policy.EffectiveBranch`,
  `POST /admin/leave-requests/{id}/approve|decline`). Frontend: staff **My Leave** (`/admin/my-leave`, in the
  Staff Portal nav + confinement allowlist) to apply/track/cancel; manager **Leave Requests** (`/admin/leave`,
  HR nav) to approve/decline (decline needs a reason). Tests: `SUI-LEAVE-001` (bnrest, in `COL-FUNC-001`)
  covers apply/queue/self-approve-block/cancel/bad-range; `leave_request_test.go` covers the weekday maths.
  **Phase 2 (balances) DELIVERED:** **per-type** allowances/balances — annual (`Staff.AnnualLeaveDays`,
  0 = org default `models.DefaultAnnualLeaveDays` = 28) and **paid sick** (`Staff.SickLeaveDays`, 0 =
  uncapped), both editable on the staff detail/create forms; a UK leave-year (Apr–Mar) balance per capped
  type (`models.LeaveBalance` + `service.allowanceForType`/`balanceForType`), exposed at
  `GET /leave-requests/balance` as a **map keyed by leave type** and shown on My Leave both as per-type
  summary cards and **inline in the request wizard for the selected type** (updates as the type changes;
  uncapped types read "not deducted from an allowance"). Capped types are limited to the remaining balance
  (`Apply` blocks over-allowance; annual + configured sick); other types are uncapped. `Apply` also
  **rejects a request overlapping the person's own existing pending/approved leave** (no double-booking).
  **Rota guard:** `shiftService.resolve` (the shared create/update path) rejects rostering a staff member
  on a date covered by their **approved** leave (`ShiftService` now takes the leave repo) — the rota
  planner surfaces the "on approved leave" error inside the shift modal.

- **My Profile hub (self-service, delivered):** the top-right avatar in `AdminLayout` links every user to
  **`/admin/profile`** — a self-service equivalent of the single-staff page for the signed-in user, resolved
  from their `Staff.UserID`. Backend `service.MeService` + `handler/admin/me.go` under the authenticated
  group: `GET /me/profile` (own staff record with computed room projection), `PUT /me/profile` (edits only a
  safe subset — `models.MeProfileUpdate`: phone/email/qualifications/emergency_contacts/DBS/first-aid;
  employment fields name/branch/role/status/type/hours/**allowances**/PIN stay manager-controlled),
  `GET /me/attendance?from&to` (own records + `StaffAbsenceSummary`), `GET /me/rota?from&to` (own shifts via
  the new `shiftRepo.FindByStaffRange`). Frontend `app/admin/profile` tabs: **Profile** (read-only employment
  + editable details, with DBS/first-aid expiry warnings ≤60 days), **Leave** (the extracted
  `components/admin/MyLeaveSection` — balances + request wizard + own requests; **four-eyes approval is
  unchanged** and still lives on the manager `/admin/leave` page), **Attendance** (summary tiles + recent
  records), **My Rota** (upcoming shifts). The standalone `/admin/my-leave` page + its nav item were removed
  (leave now lives under the profile); the staff-portal nav shows **My Profile** + My Supply Requests and the
  staff-confinement allowlist now permits `/admin/profile`. Tests: bnrest `SUI-ME-001` (in `COL-FUNC-001`). **Phase 3 (calendar/
  clash) DELIVERED:** the admin list computes a transient `Overlaps` count (other staff at the same branch
  with approved/pending leave on overlapping dates) surfaced as a coverage warning on each request, plus a
  chronological **Team schedule** tab. **Phase 4 (manager-filed) DELIVERED:** `POST /admin/leave-requests`
  (under `leave.approve`) reuses `Apply` so a manager files leave for a staff member (staff picker) — still
  pending until a *different* manager approves (four-eyes). **Planned next:** a full month-grid calendar
  view, a hard clash-block option on approval (currently a warning), and carry-over/pro-rata allowances.

Planned next: **Phase D** = Payroll summary from attendance; **Phase E** = reports (CSV/Excel/PDF) +
notifications. Then Amazon Business API (Product Search → Cart → Ordering), then full inventory/stock.

## Procurement Management module — roadmap (Phases 1–4 DELIVERED)
Goal: turn the procurement pieces into one connected **Procurement Management** module so the journey
feels like a single process: **Supply Request → Approve → Purchase Order → Place → Track → Receive →
Complete**. Phases 1–4 are now all built (on `feature/inquiry-crm`); the notes below double as the
module's design record.

- **Phase 1 — structure, workflow, usability (DONE / frontend-only, no schema change):** sidebar renamed
  `Dashboard`→**Main Dashboard** and a **Procurement** sidebar group (Overview · Supply Requests ·
  Purchase Orders · Suppliers · Catalogue · Analytics); a unified procurement area via a shared
  `ProcurementTabs` bar over the existing routes; a **Procurement Overview** (`/admin/procurement`),
  a **read-only derived Suppliers** view (`/admin/procurement/suppliers`) and **client-side
  Procurement Analytics** (`/admin/procurement/analytics`), all computed from existing carts/requests/
  products; the **Main Dashboard made role-aware** (widgets shown per existing role, branch-filtered by
  `user.branch_slugs`, no customisation); the PO detail **Track/Receive bug fixed** (stepper gating was
  status-only and the Gompels push never advanced status — now placed-aware with tooltips); improved
  Gompels-cart messaging + matched/unmatched summary. All on the shared design system
  (`lib/admin-theme.ts` ACCENT, `lib/admin-status.ts`, `components/admin/ui/*`).
- **Phase 2 — workflow statuses & fields (DONE):** SR statuses `approved`, `converted_to_po` and PO
  statuses `placed`, `tracking`, `dispatched`, `completed` (extended the `OrderRequestStatus` /
  `PurchaseCartStatus` enums + `UpdateStatus` whitelists + Kanban lanes/metas in `lib/admin-status.ts`);
  **priority** + **classroom** on requests (POs inherit branch/classroom/priority from their source
  requests); human **sequential IDs** — `SR-2026-000045` (requests), `PO-2026-000123` (purchase orders),
  `ORD-2026-000042` (store orders, minted in `orderRepository.Create`) — via an atomic `counters`
  collection (`repository.CounterRepository` + `models.FormatRef`, prefixes in `models/sequence.go`);
  these `ref`s are the prominent identifier on every board card / table / CSV / detail header (frontend
  `lib/ref.ts` `displayRef` falls back to an ObjectID-derived code for un-backfilled records). Legacy
  records were given refs by the one-shot backfill (formerly `cmd/backfillrefs`, in created_at order),
  applied everywhere and now **retired** — new records get their ref on create.
  Track/Receive **state machine** with a
  carrier **tracking-number** field (`PATCH /admin/purchase-carts/{id}/status` + `…/fulfillment`);
  Approve/Reject/Convert on the SR detail switcher and PO delivery-stage transitions + **Mark completed**.
- **Phase 3 — Suppliers entity + analytics (DONE):** a real **Supplier** entity
  (`models/supplier.go`, collection `suppliers`) — model/repo/service/handler + admin CRUD at
  `/admin/suppliers` (`SuppliersManage`); category, contacts, order email, account #, lead-time, active
  flag; the Suppliers UI merges the directory with live spend rolled up from carts/requests. Server-side
  **procurement analytics** (`service.ProcurementAnalyticsService` → `GET /admin/procurement/analytics`):
  spend by supplier/branch/month, request & order status counts, item demand, overdue orders, request→
  order & order→delivery lead times; the analytics page now sources its headline figures from it. The
  procurement engine still keys offers/orders on the free-text supplier **name**; the Supplier entity is
  the curated directory layered on top.
- **Phase 4 — roles, permissions, customisable dashboards (DONE):** a **granular permission system**
  (`models/permission.go` — `Permission` constants + a `role→[]Permission` map + `HasPermission`).
  `middleware.RequirePermission(perm)` gates each admin resource group; `middleware.ManagementOnly` is the
  outer gate so the new specialist roles enter the shell and per-resource permissions scope what they see.
  New roles **finance / admissions / procurement** (`models.Role` + `UserRole`), assignable on
  `/admin/users` and admitted at `/admin/auth/login`. `GET /auth/me` returns `{role, permissions}`; the
  frontend `lib/usePermissions.ts` hook caches it and `AdminLayout` filters nav + bounces specialists off
  pages they lack. **Per-user customizable dashboard**: `dashboard_layouts` collection + `GET/PUT
  /me/dashboard`; `DashboardClient` has a **Customize** mode with drag-drop reorder, hide/show, a
  normal/wide size toggle and reset-to-default, persisted per user (`models.DashboardWidget`).

## Dev / prod workflow
Branch model: **feature → develop → main**. `develop` is the integration branch (the repo's **default**
branch — cut feature branches off it and PR back into it); `main` is prod. **NOTE — "staging" is NOT a
git branch**: `make staging-up` / `.env.staging` / `docker-compose.staging.yml` are the **local
prod-image QA gate** (an isolated docker environment, project `bluenest-staging`) you run before
promoting `develop → main`. Don't confuse the staging *environment* with a branch.
- Local dev: `make dev` (or `make docker-restart`) → runs on :3000/:8080. Default admin is
  `admin@bluenest.uk` (see `.env`). `make seed-all` runs every seed in order; re-run `make seed-users`
  after role changes, `make seed-catalogue` after adding Gompels order CSVs.
- **Local baseline dataset (manual testing):** `docker-up`/`docker-restart` now restore a fixed, full
  single-tenant (Blue Nest) dataset **only if the DB is empty** (`make baseline-ensure`), instead of
  re-running the seeds; your data otherwise persists across restarts. The baseline is a gzipped
  `mongodump` at `deploy/baseline/baseline.archive` — **gitignored** (it embeds real Famly names, same
  PII policy as `famly-templates/`). `make baseline-reset` drops + restores the exact baseline;
  `make baseline-snapshot` overwrites the archive from the current DB. It covers the whole lifecycle
  (branches/rooms, real-named staff+children with room assignments, enquiries across every pipeline
  stage, leave in every state, rota, attendance, terms, PINs, kiosk devices). Structural data comes
  from the seeds; the operational lifecycle is layered on by `scripts/seed-baseline-lifecycle.py` (API-
  driven, PII-free). See `deploy/baseline/README.md`.
- Local prod-image gate: `make staging-up` builds the prod Dockerfiles and runs on 127.0.0.1:3000/8080
  (needs `.env.staging`; `COMPOSE_FILE` must be set — env-parity check via `scripts/check-env.sh`).
- Ship: PR feature→develop (CI: Go API + Next.js). Promote develop→main via PR (if `main` has drifted
  ahead — GitHub adds a merge commit on each release — fast-forward/merge `origin/main` into `develop`
  first). Tag releases `vX.Y.Z`.
- **Prod deploy is on the droplet** (`deploy@165.232.47.89`, app at `~/app`). It currently runs in
  **local-build mode** (`IMAGE_PREFIX` empty), so deploys must **build on the box**:
  `git fetch origin main && git reset --hard origin/main && docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build --force-recreate`.
  (The frontend Next build is memory-heavy on 4 GB — add swap if OOM. CI does push GHCR images;
  switching the droplet to GHCR pulls is a future improvement.)

## BlueNest TestFlow (`test-platform/`) — the declarative API test platform

A Markdown+YAML (`.bnrest.md`) declarative API test format + Java execution
engine (`test-platform/engine/`, Maven/JUnit 5/REST-Assured-as-transport)
that is progressively replacing/supplementing the legacy
`test-automation/rest-assured-suite` (below) via a strangler pattern — the
legacy suite stays fully intact and running until every test it covers has
a verified bnrest replacement (tracked in `test-platform/migration-manifest.json`,
human-readable view in `docs/testing/test-migration-map.md`). Full design
in `docs/testing/test-platform-architecture.md`; endpoint-by-endpoint
coverage ledger in `docs/testing/endpoint-inventory.md`. Tests are
Collection → Suite → Case → Util, executed via
`Given/When/Then/And` command lines (`Get/Post/Put/Patch/Delete`,
`Assert`/`AssertJson`/`AssertStatus`, `Call`, `CopyJson`, `Set`, `ExpectFail`,
etc. — a closed, restricted grammar, never `eval()`'d as code), with a
dependency graph + a classic-desktop-styled visual mapper at
`frontend/app/test-mapper` (dev tool, not a tenant feature). Run via
`make test-suite SUITE=<id>` / `test-case CASE=<id>` / `test-collection
COLLECTION=COL-FUNC-001` etc. (thin wrappers around one CLI); `make
test-map` regenerates the dependency graph for the mapper.
`COL-FUNC-001` (the primary generic functional collection) currently runs
**24 suites** covering essentially every real, in-scope backend endpoint —
the original nursery lifecycle (Auth/Branch/Room/Staff/Enquiry/Registration/
Key-Person/Visit/Assignment/Attendance/Daily-Logs/Schedule/Network — the
last replacing the legacy suite's `ConcurrencySuite`+`SecuritySuite`) plus
brand-new coverage the legacy suite never had at all: Store (products/cart/
checkout/orders), Blog, Kiosk (device+PIN; the kiosk-facing routes
themselves need a custom `X-Kiosk-Token` header this engine can't send yet
— a documented, tracked limitation, not silently skipped), Procurement
(supply requests/catalogue/purchase-orders/suppliers/analytics/templates),
Shifts (rota), Audit log, and User Account Management (users/roles/org
self-service/platform organisations/dashboards). **`SUI-AUTH-001` runs
LAST in the collection** (not first) — it now ends with a login
rate-limit regression lock that deliberately burns the shared per-IP
`/auth/login` budget every other suite's own login depends on, mirroring
why the legacy `SecuritySuite` had to run last too. A known, accepted
characteristic: a full `COL-FUNC-001` run's cumulative login volume can
still trip that same rate limit on whichever suite happens to need a
fresh login last, independent of `AUTH-TC-003` — every suite passes 100%
individually; only a full-collection run occasionally shows one
rate-limit-flavored failure, not a real regression.

**A real production bug was found and fixed while writing this test
coverage** (per this repo's established practice — see the test-writing
feedback note in project memory): `POST /auth/register` minted a
brand-new customer's very first JWT with an **empty `org_id` claim**
(`internal/service/auth.go`'s `Register` built its `models.User` locally
and issued the token from that pre-insert struct, whose `OrgID` was never
populated — `TenantCollection.InsertOne`'s org-stamping rewrites the
document sent to Mongo, not the caller's Go value). `middleware.Auth`
treats an empty `org_id` claim as cross-org, so every write that customer
made — including their own checkout order — got created with **no
`org_id` at all**, invisible to any org-scoped admin fetch. Fixed by
having `Register` re-fetch the user (mirroring what `Login` already does)
before issuing tokens; regression-locked by `SUI-STORE-001`'s
`STORE-TC-007/008/009`.

**Known leftover test data (local dev DB only, not staging/prod):** live
manual debugging of the `org_id` bug above (curl against `localhost:8080`)
left a handful of records that don't follow the `QA-AUTOTEST-` fixture
prefix, so they won't turn up in a `QA-AUTOTEST` grep — a branch
`qa-debug-branch-*` (archived, not hard-deleted — branches have no hard
delete), a staff record + its login user under that branch, three
standalone customer users (`qa-debug-*@bluenest.test`), one `pending`
order, and one supply request — all harmless local-dev debris, safe to
delete by hand (`db.branches`/`db.staff`/`db.users`/`db.orders`/
`db.order_requests`, matching on `qa-debug` in the relevant name/email
field) whenever convenient.

## QA & test automation (`test-automation/`)
- **`test-automation/test-instructions`** — the master QA test plan (26 sections, `TC-XXX-NNN`-numbered
  test cases covering the full nursery-management lifecycle: branch → staff → enquiry → registration →
  room/staff assignment → attendance → daily logs → KPIs → security → performance). Written against an
  idealised from-scratch tenant; this codebase's suites adapt it to the real, already-seeded Harrow branch
  (see the REST-Assured README's "Why this suite runs against the real Harrow branch").
- **`test-automation/rest-assured-suite/`** — a real, compiling Java/Maven/REST-Assured 5/JUnit 5 API
  regression suite (**not** a UI/browser suite — see its README "What this suite is and isn't").
  `TestMethodOrder`-based `*Suite` classes, one per plan phase, package-numbered `phase01_auth` ..
  `phase13_concurrency`, then `phase90_security` so alphabetical execution order matches the plan's own
  phase order — `phase90_security`'s permanently-high number (not its plan phase §19) exists because its
  rate-limit regression test burns the shared per-IP login budget for the rest of that window (see
  `SecuritySuite`'s class Javadoc); every test's `@DisplayName` carries its `TC-XXX-NNN` id (or a
  `-REG`/`SEC-NNN` id for suite-authored regression locks). Requires a JDK 17+ + Maven (`brew install openjdk
  maven`; openjdk is keg-only on macOS — `export PATH="/opt/homebrew/opt/openjdk/bin:$PATH"` and `JAVA_HOME`
  accordingly). Run via **`make test-e2e`** (full suite) / **`make test-e2e-regression`** (fix-lock subset —
  fastest deploy-safety check) from the repo root — these wrap `mvn test` and export `PATH`/`JAVA_HOME` for
  you, overridable via `QA_BASE_URL` / `QA_ADMIN_EMAIL` / `QA_ADMIN_PASSWORD` env vars — or `cd
  test-automation/rest-assured-suite && mvn test` directly (`-Dgroups=regression` / `-Dgroups=golden-path`
  for the filtered subsets). **Its own README has an exact, validated coverage matrix — check it before
  assuming "the suite" means "full plan coverage"; as of this writing it references 49 of the plan's 55
  `TC-XXX-NNN` ids (many as deliberate "gap lock" tests — a passing test that proves the plan's *expected*
  behaviour is currently absent, e.g. no room-capacity/age-band enforcement, no room-staff assignment
  validation). Duplicate-enquiry detection is no longer one of these — see "Duplicate prevention & real-time
  sync" below. The remaining 6 (`TC-VISIT-002/003`, `TC-LOG-002/003`,
  `TC-RATIO-001/002`) are verified N/A — no such entity/record-type/live-ratio-system exists server-side at
  all, not merely untested. See the README's coverage matrix before starting new coverage, and extend it
  when you add a suite.**
- **`test-automation/injection-fuzz.sh`** — a bash + curl security-fuzzing script (NoSQL operator
  injection, malformed-regex/ReDoS probes against every free-text search endpoint, JSON type-confusion,
  auth-bypass probes). `./test-automation/injection-fuzz.sh [base_url] [admin_email] [admin_password]`,
  grep-able `PASS|FAIL` output, non-zero exit on any failure.
- **`test-automation/section18-plan.md`** — the scoped-out plan for what the REST-Assured suite and fuzz
  script deliberately don't cover: load/performance testing at scale (needs an isolated perf DB — never
  point synthetic bulk-seeding at the real `blue_nest_montessori` DB), a fuller security pass (rate-limit
  fuzzing, dependency/secret scanning), accessibility (axe-core), and a real browser/UI-layer suite
  (Playwright — a deliberately separate suite from the API-layer one, see its README).
- Both the REST-Assured suite and the fuzz script run against the **real Harrow branch** with real seeded
  data (there is no disposable per-test database yet). Every fixture they create is `QA-AUTOTEST-`-prefixed
  and self-cleans in `@AfterAll` where a delete endpoint exists; anything left behind after an interrupted
  run is safe to delete by hand purely by that prefix. **Do not delete `QA-AUTOTEST-` fixtures found in the
  live DB without checking first** — some (e.g. a persistent test child registered against Harrow) are
  intentionally kept as ongoing fixtures per explicit user instruction, not run debris.

## Conventions
- Commits: conventional style, **no `Co-Authored-By` Claude trailer**.
- Don't commit `next-env.d.ts` churn or stray root files (QA reports/xlsx).
- Round trig in SVG coords (avoid SSR hydration mismatches).
- Verify changes: `cd backend && go build ./... && go vet ./internal/...`;
  `cd frontend && npm run type-check && npx eslint <paths>`; then browser-check via chrome-devtools.
  **Then, for any change touching backend business logic, permissions, or an API contract: rebuild +
  redeploy the affected container(s) (`docker compose build backend|frontend && docker compose up -d
  --force-recreate backend|frontend`) and run the REST-Assured suite (`make test-e2e` from the repo root,
  or at minimum `make test-e2e-regression` for the fast fix-lock subset) — this is a required deployment
  step before pushing to remote, not optional polish. A change that only touches an area the suite doesn't
  cover yet (see its coverage matrix) still needs the Go/TS build+vet+lint steps, but flag the coverage gap
  rather than skipping verification silently.**
- Keep this file + `README.md` / `ARCHITECTURE_SUMMARY.md` / `swagger.yaml` updated as features land.
