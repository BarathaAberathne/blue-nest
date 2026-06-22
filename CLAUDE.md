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
  - `cmd/` — `api` (server), `seed`/`seedbranches`/`seedusers` (idempotent seeds), `makeadmin`.
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
- `staff` — practitioners; submit/track order requests only (no admin dashboard).
- `customer` — parents (store account at `/account`).
Guards: `AdminOnly` = super_admin|admin|branch_manager; `SuperAdminOnly` = super_admin. Add roles
to a route via `middleware.RequireRole("...")`. Login: `POST /auth/login` (parents/staff),
`POST /admin/auth/login` (management). After login, staff/customers → `/account`, management →
`/admin/dashboard`. There is **no social/OAuth login** (removed).

## How to add a backend entity (the standard pattern)
Mirror an existing module (e.g. `enquiries`, `orders`): model → repository (`Create`, `FindAll`
sorted, `FindByID`) → service (interface + impl) → handler (+ admin handler) → register routes in
`routes.go` under the right middleware group → wire repo+service in `server.go` (`routes.Services`).
Responses use `response.OK/Created/BadRequest/...`; request bodies via `validator.DecodeJSON`.

## Admin UI pattern (frontend)
New admin section = mirror **Orders/Inquiries**: a server `page.tsx` (metadata `robots:noindex`)
wrapping a `*Client.tsx` in `AdminLayout`; list page (table + filters/search + optional CSV
export) and a `[id]` detail page; add an item to `NAV_ITEMS` in `AdminLayout.tsx` and a KPI in
`app/admin/dashboard/DashboardClient.tsx`. Reuse `components/ui/{Badge,Card}`. Data via `lib/api.ts`
methods + `getAccessToken()`.

## Modules (current)
Store (products/categories/cart/checkout/orders), Blog, Branches, Contact/**Enquiries** (inquiry
tracker at `/admin/inquiries`), **Users** (super-admin account mgmt), Online Play Area (4 games).
- **Audit log** (`models/audit_log.go`, collection `audit_logs`): append-only record of admin
  mutations. `service.AuditService.Record(r, action, entityType, entityID, summary, details)` is
  called from admin handlers after a successful mutation (best-effort — never blocks the operation;
  pulls actor id/email/role from the JWT context + client IP). Viewable by **all** management roles
  at `/admin/activity` (`GET /admin/audit-logs`, filters: `actor`, `entity_type`, `action`, `limit`).
- **Order/supply requests** (`models/order_request.go`, collection `order_requests`): staff submit
  a list of items they need (name, supplier=Gompels|Amazon|Other, qty, notes, optional
  `catalogue_item_id`) at `/order-requests`; they can also **cancel** their own pending requests
  (`PATCH /order-requests/{id}/cancel`). Management reviews the aggregated list at
  `/admin/order-requests` (labelled **Supply Requests**), filters, exports the buy-list CSV, and
  moves status pending→ordered→received (or cancelled). Staff routes under `Auth` +
  `RequireRole(super_admin,admin,branch_manager,staff)` (customers excluded); admin routes under `AdminOnly`.
- **Catalogue** (`models/catalogue_item.go`, collection `catalogue_items`): known products with
  per-supplier offers (`{supplier, code/ASIN, pack_size, price, price_per_unit}`). It's the
  cache + curation layer the sourcing engine writes to. Admin CRUD at `/admin/catalogue`
  (`AdminOnly`); staff read-only at `GET /catalogue` (for the request picker / datalist).
- **Order creation tool** (`models/purchase_cart.go`, collection `purchase_carts`): admin selects
  supply requests on `/admin/order-requests` → **Generate cart** → the **sourcing engine**
  (`internal/platform/sourcing`) finds the best & cheapest offer per item (catalogue cache first,
  then live supplier search), aggregates + splits by supplier into draft carts at
  `/admin/purchase-carts` (**Generated Carts**). Admin reviews/overrides lines + recipient on the
  detail page, then **Send** emails the order (HTML table + CSV attachment via
  `Mailer.SendWithAttachments`) to the supplier and flips covered requests to `ordered`.
  Routes (`AdminOnly`): `POST /admin/purchase-carts/generate`, `GET /admin/purchase-carts[/{id}]`,
  `PUT /admin/purchase-carts/{id}`, `POST /admin/purchase-carts/{id}/send`. Sourcing adapters:
  `GompelsAdapter` (HTML scrape, best-effort, off unless `GOMPELS_SEARCH_ENABLED=true`),
  `AmazonAdapter` (stub, gated by `AMAZON_BUSINESS_ENABLED`; Amazon Business API is a later phase).
  Env: `GOMPELS_ORDER_EMAIL`, `SUPPLIES_ORDER_EMAIL`, `GOMPELS_SEARCH_ENABLED`, `GOMPELS_SEARCH_URL`,
  `AMAZON_BUSINESS_ENABLED`.

Planned next: Amazon Business API (Product Search → Cart → Ordering), then full inventory/stock.

## Dev / staging / prod workflow
Branch model: **feature → staging → main**. `staging` is the pre-prod QA branch; `main` is prod.
- Local dev: `make dev` (or `make docker-restart`) → seeds + runs on :3000/:8080. Default admin is
  `admin@bluenest.uk` (see `.env`). Re-run `make seed-users` after role/migration changes.
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
