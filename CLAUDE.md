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
Guards: `AdminOnly` = super_admin|admin|branch_manager; `SuperAdminOnly` = super_admin. Add roles
to a route via `middleware.RequireRole("...")`. Login: `POST /auth/login` (parents/staff),
`POST /admin/auth/login` (management). After login, customers → `/account`, **staff →
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
  supply requests on `/admin/order-requests` → **Generate cart** → the **sourcing engine**
  (`internal/platform/sourcing`) finds the best & cheapest offer per item (catalogue cache first,
  then live supplier search), aggregates + splits by supplier into draft carts at
  `/admin/purchase-carts` (**Purchase Orders**). The PO detail page is a **lifecycle stepper**:
  **Review** (edit lines/recipient) → **Place order** (**Send** emails the order — HTML table + CSV
  attachment via `Mailer.SendWithAttachments` — or **Add to Gompels cart** via the extension) →
  **Track** (set `supplier_order_ref` + `expected_delivery_date`; propagated to the covered staff
  requests) → **Receive** (per-line `qty_received`). Status flow `draft → ordered →
  partially_received → received` (legacy `sent` reads as `ordered`; `PurchaseCart.IsPlaced()` gates
  edits & post-placement actions). Placing flips covered requests to `ordered`; full receipt flips
  them to `received` + sets `delivered_at`. Lines carry `qty_received`; the list shows status filter +
  expected/received columns (overdue flagged).
  Routes (`AdminOnly`): `POST /admin/purchase-carts/generate`, `GET /admin/purchase-carts[/{id}]`,
  `PUT /admin/purchase-carts/{id}`, `POST /admin/purchase-carts/{id}/send`,
  `PATCH /admin/purchase-carts/{id}/fulfillment`, `POST /admin/purchase-carts/{id}/receive`. Sourcing adapters:
  `GompelsAdapter` (HTML scrape, best-effort, off unless `GOMPELS_SEARCH_ENABLED=true`),
  `AmazonAdapter` (stub, gated by `AMAZON_BUSINESS_ENABLED`; Amazon Business API is a later phase).
  Env: `GOMPELS_ORDER_EMAIL`, `SUPPLIES_ORDER_EMAIL`, `GOMPELS_SEARCH_ENABLED`, `GOMPELS_SEARCH_URL`,
  `AMAZON_BUSINESS_ENABLED`.
  - **Add to Gompels cart (browser extension)** (`gompels-extension/`, MV3, loaded unpacked): on a
    Gompels cart detail page the admin clicks **Add to Gompels cart**; the page `postMessage`s the
    `{code, qty, name}` lines to the extension (handoff is **ACK-gated** + PING/PONG detection, so the
    UI only reports success when the extension actually received it). Via the popup's **Fill cart now**
    it **first empties the Gompels basket** — **server-side via `fetch`** from the Quick Order page
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
    `/checkout/cart/` (has **E-Mail Basket**). The **popup** shows a per-line progress list (chips:
    added / substituted / not found) + a summary bar. The PO **Track** step shows the fill results; for
    search-resolved lines an **Accept** saves the discovered code via `POST /admin/catalogue/learn`
    (`UpsertByName`) — the catalogue **self-improves** (gated by Accept). An **auto-start** popup
    setting fills as soon as the Gompels tab opens. Stops at a filled cart — no payment automation, no
    stored Gompels creds. Selectors live in `content-gompels.js` (`SEL`); see `gompels-extension/README.md`.
  - **Reorder & standing-order templates** (`models/order_template.go`, collection `order_templates`,
    shared org-wide): on `/admin/my-requests` staff **Save as template**, **Use** a template, or
    **Reorder** a past request. Routes `GET/POST/DELETE /order-templates` (staff+management). Admin
    one-click **Generate & push** on `/admin/order-requests` generates the cart + hands it to the extension.

Planned next: Amazon Business API (Product Search → Cart → Ordering), then full inventory/stock.

## Dev / staging / prod workflow
Branch model: **feature → staging → main**. `staging` is the pre-prod QA branch; `main` is prod.
- Local dev: `make dev` (or `make docker-restart`) → seeds + runs on :3000/:8080. Default admin is
  `admin@bluenest.uk` (see `.env`). Re-run `make seed-users` after role/migration changes;
  `make seed-catalogue` after adding Gompels order CSVs. `make seed-all` runs every seed in order.
- Local prod-image gate: `make staging-up` builds the prod Dockerfiles and runs on 127.0.0.1:3000/8080
  (needs `.env.staging`; `COMPOSE_FILE` must be set — env-parity check via `scripts/check-env.sh`).
- Ship: PR feature→staging (CI: Go API + Next.js). Promote staging→main via PR (often needs a
  `git merge origin/main` into staging first to satisfy branch protection). Tag releases `vX.Y.Z`.
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
