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
Planned: **audit log**, **order/supply requests** (staff request items; management reviews + CSV),
then inventory/HR.

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
