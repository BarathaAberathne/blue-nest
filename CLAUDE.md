# Blue Nest Montessori — Project Guide (for AI agents & new devs)

Monorepo for the Blue Nest Montessori website + admin/operations system. Being grown toward a
full **nursery management system** (HR, rotas, inventory) — keep auth/accounts separate from
future employment/HR data so new modules attach cleanly.

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
  (`/admin/command-center`), which is also the first sidebar item for anyone with `dashboard.view`. Assign
  it on `/admin/users`, or seed one via `DEFAULT_DIRECTOR_EMAIL/PASSWORD` (`make seed-users`).
Guards: `AdminOnly` = super_admin|admin|branch_manager; `ManagementOnly` = those + finance|admissions|
procurement|director (the outer gate on the admin route group); `SuperAdminOnly` = super_admin. **Granular
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
  `#FFC857`, error `#FF5C73`) so nothing leaks into the light admin theme; `body:has(.cc-root)` darkens
  the page. Composition (`CommandCenterClient.tsx`): topbar (clock/logo/wordmark/notifications) · left
  nav rail (MD profile + nav + system-status radar) · centre workspace (**KPI row 1** + dense **KPI row 2**
  operational tiles + Branch Overview centrepiece with 5 branch cards + funnel/attendance/sentiment
  cluster (funnel + **per-branch scrollable attendance & parent-sentiment**, one chart per branch) +
  **occupancy heatmap / enquiry-sources donut / performance gauges** + **staff status / children's status
  / compliance centre** + bottom bar: Quick Actions, Mission Objectives, **AI Executive Brief** with action
  buttons, System Health) · right rail (**expanded Financial analytics** with revenue/expenses/profit/
  funding/outstanding/cashflow + budget-vs-actual trend · **Capacity Forecast** with 7d/30d/term tabs ·
  **monthly Calendar** with colour-coded event dots · Notifications · **Live Activity feed** · **Parent
  Comms**). Branch cards are **interactive** — hover reveals a per-branch intelligence popover (children,
  staff, occupancy, revenue, open issues, next event, review). Per-branch figures come from
  `BRANCH_METRICS` in `data.ts`. **Widgets are wired into the CMS**: every KPI card/tile, section panel,
  branch card, sidebar nav item, quick action, AI-brief button and topbar control is clickable and
  `router.push`es into the relevant existing admin page (see the `R` route map + `NAV_LINKS`/`KPI_LINKS`/
  `tileLink` in `CommandCenterClient.tsx`; modules without a page yet fall back to the closest one). The
  `director` role (above) is its intended audience. **The enquiries/admissions pipeline is live-wired**:
  `live.ts` (`useEnquiryPipeline`) fetches `GET /admin/enquiries/stats` with the signed-in token and feeds
  the real funnel + conversion, the Enquiries KPI, and the Booked-Visits/Applications/Enquiry-Response
  tiles (Admission Pipeline shows a **● Live** tag). It **falls back to the static mock** when there's no
  token or the request fails (CORS/permissions), so the page still renders for an anonymous demo. All
  other figures (children, attendance, finance, sentiment, compliance, staffing, activity) remain mock —
  the enquiries pipeline is the first module connected to real backend data.

Planned next: Amazon Business API (Product Search → Cart → Ordering), then full inventory/stock.

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
  records get refs via the idempotent **`make backfill-refs`** (`cmd/backfillrefs`, in created_at order).
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
- Local dev: `make dev` (or `make docker-restart`) → seeds + runs on :3000/:8080. Default admin is
  `admin@bluenest.uk` (see `.env`). Re-run `make seed-users` after role/migration changes;
  `make seed-catalogue` after adding Gompels order CSVs. `make seed-all` runs every seed in order.
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

## Conventions
- Commits: conventional style, **no `Co-Authored-By` Claude trailer**.
- Don't commit `next-env.d.ts` churn or stray root files (QA reports/xlsx).
- Round trig in SVG coords (avoid SSR hydration mismatches).
- Verify changes: `cd backend && go build ./... && go vet ./internal/...`;
  `cd frontend && npm run type-check && npx eslint <paths>`; then browser-check via chrome-devtools.
- Keep this file + `README.md` / `ARCHITECTURE_SUMMARY.md` / `swagger.yaml` updated as features land.
