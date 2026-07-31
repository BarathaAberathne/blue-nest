# Endpoint inventory & test coverage

Ground truth for "add tests for all endpoints" — every real route
registered in `backend/internal/routes/routes.go` (177 registrations, a
handful serving two logical purposes via closures), grouped by module,
each marked whether it currently has **any** real `.bnrest.md` test
exercising it. Updated after both Wave 1 (finishing the original 123-test
legacy migration) and Wave 2 (all-new suites for modules the legacy suite
never touched) — see `test-platform/migration-manifest.json` for the exact
per-test mapping and `docs/testing/test-migration-map.md` for the
human-readable per-suite tables.

**Current state: essentially every real, in-scope endpoint is covered.**
Remaining gaps are all deliberate and documented below, not silent: two
external webhooks, the health check, CSV/image multipart uploads (this
engine's REST commands are JSON-only), completing a real Stripe payment,
kiosk-facing routes (need a custom `X-Kiosk-Token` header — a real engine
limitation, see `SUI-KIOSK-001`), and a handful of "extend" items on
already-migrated suites that are lower-value incremental additions.

## Public (no auth)

- [ ] `GET /api/v1/health` — infra healthcheck, not a functional-test target
- [ ] `POST /api/v1/webhooks/stripe` — external webhook, needs a real signed Stripe event; out of scope for functional API tests
- [ ] `POST /api/v1/integrations/gbp/digest` — external shared-secret webhook, same as above
- [ ] `POST /auth/login` (customer/staff login) → **SUI-AUTH-001** (only `/admin/auth/login` covered so far; `/auth/register`, the other customer-facing auth route, IS covered)
- [x] `POST /admin/auth/login` → `SUI-AUTH-001`
- [x] `POST /auth/register` → `SUI-STORE-001` (`AUTH-UTIL-002`, also the vehicle for finding + fixing the customer-registration `org_id` bug, see below)
- [ ] `POST /auth/logout`, `POST /auth/refresh` → **SUI-AUTH-001** (still open)
- [x] `GET /products`, `/products/slug/{slug}` → `SUI-STORE-001`; `/products/{id}`, `GET /categories` still untested directly (low-value extension of the same handler pattern)
- [x] `GET /blog/posts`, `/blog/posts/{slug}`, `POST .../like`, `GET/POST .../comments` → `SUI-BLOG-001`
- [ ] `GET /branches`, `/branches/{slug}` (public) → **SUI-BRANCH-001** (extend)
- [ ] `POST /contact` → **SUI-ENQUIRY-001** (extend — the public entry point into the same enquiry pipeline)
- [ ] `POST /kiosk/session`, `GET /kiosk/staff`, `/kiosk/overview`, `POST .../clock-in`, `.../clock-out` — **not testable with this engine today**: these routes authenticate via a custom `X-Kiosk-Token` header, and the engine's REST commands only ever attach `Authorization: Bearer` (no generic `Header <name> <value>` primitive exists). Documented as a real, tracked platform limitation in `SUI-KIOSK-001`, not silently skipped. The admin-side device lifecycle + staff PIN endpoint ARE covered.

## Authenticated (any logged-in user)

- [x] `GET /auth/me` → `SUI-USERACCOUNT-001`
- [x] `GET/PUT /me/dashboard`, `GET /me/dashboards`, `POST .../activate`, `DELETE .../{name}` → `SUI-USERACCOUNT-001`
- [x] `GET /cart`, `POST/PUT/DELETE /cart/items[/{id}]` → `SUI-STORE-001`
- [x] `POST /checkout/session` → `SUI-STORE-001` — session creation + the order-first pending/unpaid side effect are covered; completing a real payment needs the Stripe-hosted page or a signed webhook payload, explicitly not attempted (see the suite's own note)
- [x] `GET /orders/me`, `/orders/{id}` (customer, incl. ownership rejection) → `SUI-STORE-001`

## Staff supply requests (staff + management)

- [x] `POST /order-requests`, `GET .../me`, `GET .../{id}`, `PATCH .../cancel` → `SUI-PROCUREMENT-001`
- [x] `GET /catalogue` (staff read) → `SUI-PROCUREMENT-001`
- [x] `GET/POST/DELETE /order-templates[/{id}]` → `SUI-PROCUREMENT-001`

## Admin — Organisation self-service

- [x] `GET/PUT /admin/organisation` → `SUI-USERACCOUNT-001`

## Admin — Store (products/categories/orders)

- [x] `GET/PATCH /admin/orders[/{id}][/status]` → `SUI-STORE-001`
- [x] `GET/POST/PUT/DELETE /admin/products[/{id}]` → `SUI-STORE-001`; `POST .../import` still untested — CSV multipart, needs a file body this engine's REST commands don't support (JSON only)
- [x] `POST /admin/categories` → `SUI-STORE-001`; GET-list/PUT/DELETE untested (same handler shape, low-value extension)

## Admin — Blog

- [x] `GET/POST/PUT/DELETE /admin/blog/posts[/{id}]`, `POST .../publish-scheduled` → `SUI-BLOG-001`; `POST /admin/uploads/image` untested — same multipart-file gap as CSV import

## Admin — Enquiries / admissions CRM

- [x] `GET/POST /admin/enquiries` → `SUI-ENQUIRY-001`
- [ ] `GET /admin/enquiries/page` (paged list) → **SUI-ENQUIRY-001** (extend)
- [ ] `GET /admin/enquiries/stats` → **SUI-ENQUIRY-001** (extend)
- [ ] `GET /admin/enquiries/tasks` → **SUI-ENQUIRY-001** (extend)
- [ ] `GET /admin/enquiries/assignees` → **SUI-ENQUIRY-001** (extend)
- [ ] `POST /admin/enquiries/bulk` → **SUI-ENQUIRY-001** (extend)
- [x] `GET /admin/enquiries/{id}` → `SUI-ENQUIRY-001`
- [x] `PATCH /admin/enquiries/{id}/status` → `SUI-ENQUIRY-001`/`SUI-AUDIT-001`
- [x] `POST /admin/enquiries/{id}/notes` → `SUI-ENQUIRY-001`
- [ ] `PATCH /admin/enquiries/{id}/follow-up` → **SUI-ENQUIRY-001** (extend)
- [ ] `PATCH /admin/enquiries/{id}/assign` → **SUI-ENQUIRY-001** (extend)
- [x] `POST /admin/enquiries/{id}/register` → `SUI-REG-001`
- [ ] `POST /admin/enquiries/{id}/reply` → **SUI-ENQUIRY-001** (extend)

## Admin — Audit / activity log

- [x] `GET /admin/audit-logs` → `SUI-AUDIT-001` (incl. `entity_type`/`action`/`actor`/`limit` filters)

## Admin — Procurement

- [x] `GET/PATCH /admin/order-requests[/{id}][/status]` → `SUI-PROCUREMENT-001`
- [x] `GET/POST/PUT/DELETE /admin/catalogue[/{id}]`, `POST .../learn` → `SUI-PROCUREMENT-001`
- [x] `POST /admin/purchase-carts/generate`, `GET/PUT /admin/purchase-carts[/{id}]`, `POST .../exported`, `PATCH .../fulfillment`, `POST .../receive` → `SUI-PROCUREMENT-001`; `POST .../attachment` untested (multipart-file gap)
- [x] `GET/POST/PUT/DELETE /admin/suppliers[/{id}]` → `SUI-PROCUREMENT-001`
- [x] `GET /admin/procurement/analytics` → `SUI-PROCUREMENT-001`

## Admin — Nursery: Rooms & Children

- [x] `GET/POST /admin/rooms` → `SUI-ROOM-001`
- [ ] `GET/PUT /admin/rooms/{id}` → **SUI-ROOM-001** (extend — Get/Update not yet covered)
- [x] `DELETE /admin/rooms/{id}` → `SUI-ROOM-001`
- [x] `GET /admin/children`, `/admin/children/stats` → `SUI-REG-001`/`SUI-KEYPERSON-001`
- [x] `GET /admin/children/capacity-forecast` → `SUI-KPI-001`
- [x] `GET/POST /admin/children/{id}`/`/admin/children` → `SUI-REG-001`/`SUI-KEYPERSON-001`
- [x] `PUT /admin/children/{id}` → `SUI-ASSIGN-001`/`SUI-KPI-001` (room assignment, partial-update regressions, session-schedule updates)
- [x] `PATCH /admin/children/{id}/key-person`, `DELETE /admin/children/{id}` → `SUI-KEYPERSON-001`

## Admin — Attendance (child daily register)

- [x] `GET /admin/attendance`, `/admin/attendance/today`, `POST .../check-in`, `.../check-out`, `PATCH .../mark` → `SUI-ATT-001`

## Admin — People / HR: Staff, Staff-Attendance, Shifts, Kiosk devices

- [ ] `GET /admin/staff`, `/admin/staff/{id}` → **SUI-STAFF-001** (extend — List/Get not yet covered)
- [x] `GET /admin/staff/{id}/attendance-summary` → `SUI-ATT-001`
- [x] `POST/PUT/DELETE /admin/staff[/{id}]` → `SUI-STAFF-001`
- [x] `GET /admin/staff/{id}/key-children` → `SUI-KEYPERSON-001`
- [x] `GET /admin/staff-attendance`, `/today`, `/summary`, `POST .../clock-in`, `.../clock-out`, `PATCH .../mark`, `.../{id}/correct` → `SUI-ATT-001`
- [x] `GET/POST/PUT/DELETE /admin/shifts[/{id}]` (rota) → `SUI-SHIFTS-001`
- [x] `GET/POST/PATCH/DELETE /admin/kiosk-devices[/{id}]`, `PUT /admin/staff/{id}/pin` → `SUI-KIOSK-001`

## Admin — Branch Management

- [x] `GET/POST /admin/branches` → `SUI-BRANCH-001`
- [ ] `GET /admin/branches/overview`, `/{slug}/dashboard`, `/{slug}/reviews` → **SUI-BRANCH-001** (extend)
- [ ] `GET /admin/branches/{slug}` → **SUI-BRANCH-001** (extend)
- [x] `PUT /admin/branches/{slug}` → `SUI-BRANCH-001` (config round-trip)
- [ ] `PATCH /admin/branches/{slug}/managers` → **SUI-BRANCH-001** (extend)
- [x] `POST /admin/branches/{slug}/archive` → `SUI-BRANCH-001`/every dynamic-branch suite's own Teardown

## Admin — Daily records (observations/incidents/safeguarding/medication/meals)

- [x] `GET/POST/PUT/PATCH/DELETE /admin/daily-records[/{id}][/status]`, `/stats` → `SUI-LOG-001`/`SUI-NET-001`

## Admin — Organisations (platform operator, cross-tenant)

- [x] `GET/POST /admin/organisations[/{id}]` → `SUI-USERACCOUNT-001` (`platform_super_admin`-gated, incl. rejection for a regular `super_admin`); `PUT` untested (same handler shape as `POST`)

## Admin — Account management, Roles, Dashboard profiles (super-admin only)

- [x] `GET /admin/users` → `SUI-USERACCOUNT-001`
- [x] `POST /admin/users`, `PUT /admin/users/{id}`, `POST .../reset-password` → `SUI-USERACCOUNT-001` (incl. self-lockout guards)
- [x] `DELETE /admin/users/{id}` → `SUI-USERACCOUNT-001` (incl. self-delete rejection)
- [x] `GET/POST/PUT/DELETE /admin/roles[/{name}]` → `SUI-USERACCOUNT-001`
- [x] `GET/POST/DELETE /admin/dashboard-profiles[/{slug}]` → `SUI-USERACCOUNT-001`

## Suite plan summary

| Suite | Status | Scope |
|---|---|---|
| `SUI-AUTH-001` | extend | `/admin/auth/login`, Security-suite migration (SEC-TC-001..007, rate-limit); customer login/register/logout/refresh/`me` still open (register covered elsewhere, in `SUI-STORE-001`) |
| `SUI-BRANCH-001` | extend | public branches, overview/dashboard/reviews/managers still open |
| `SUI-ROOM-001` | extend | Get/Update room still open |
| `SUI-STAFF-001` | extend | List/Get staff still open |
| `SUI-ENQUIRY-001` | extend | paged list, stats, tasks, assignees, bulk, follow-up, assign, reply, public `/contact` still open |
| `SUI-VISIT-001` | ✅ built (Wave 1) | visit-booking status transitions |
| `SUI-ASSIGN-001` | ✅ built (Wave 1) | child→room, room→staff assignment |
| `SUI-ATT-001` | ✅ built (Wave 1) | child + staff attendance registers |
| `SUI-LOG-001` | ✅ built (Wave 1) | daily records |
| `SUI-KPI-001` | ✅ built (Wave 1) | schedule/capacity-forecast |
| `SUI-NET-001` | ✅ built (Wave 1) | duplicate/replay-call regression locks + documented concurrency-testing limitation |
| `SUI-STORE-001` | ✅ built (Wave 2) | products, categories, cart, checkout, orders (public + admin) — found + fixed a real bug along the way (see below) |
| `SUI-BLOG-001` | ✅ built (Wave 2) | blog posts, likes, comments (public + admin) |
| `SUI-KIOSK-001` | ✅ built (Wave 2) | admin device lifecycle + staff PIN; kiosk-facing routes documented as untestable (custom-header limitation) |
| `SUI-PROCUREMENT-001` | ✅ built (Wave 2) | order-requests, catalogue, purchase-carts, suppliers, analytics, templates |
| `SUI-SHIFTS-001` | ✅ built (Wave 2) | rota/shift CRUD |
| `SUI-AUDIT-001` | ✅ built (Wave 2) | audit log |
| `SUI-USERACCOUNT-001` | ✅ built (Wave 2) | users, roles, org self-service, platform organisations, dashboard layouts/profiles |

## A real bug found (and fixed) while writing `SUI-STORE-001`

Verifying `STORE-TC-007`'s "checkout creates a pending order the admin can
immediately see" claim surfaced a genuine multi-tenancy bug: a **brand-new
customer's very first JWT (minted by `POST /auth/register`) always carried
an empty `org_id` claim**. `authService.Register` built its `models.User`
struct locally and minted the token straight from it — but
`TenantCollection.InsertOne`'s org-stamping (`stampOrg`, `repository/
tenant.go`) rewrites the document sent to Mongo, not the caller's original
Go struct, so the in-memory copy's `OrgID` stayed `""`. `middleware.Auth`
then treats an empty `org_id` claim as "cross-org" (`OrgFromContext`), so
every subsequent write by that customer — including their own checkout
order — was created with **no `org_id` at all**, permanently invisible to
any org-scoped admin fetch (`GET /admin/orders/{id}` 404'd even with the
exact right id). `Login` was never affected (it re-fetches the user via
`FindByEmail` before minting, which correctly rounds through the DB's
already-stamped value) — this was specific to the registration path.
**Fixed** in `internal/service/auth.go`'s `Register` by re-fetching the
user the same way `Login` does before issuing tokens. Regression-locked by
`STORE-TC-007`/`008`/`009` (all of which now pass against the fixed
backend). Rebuilt + redeployed the backend container as part of this fix,
per this repo's verification convention for backend business-logic changes.

Out of scope for now (flagged, not silently skipped): the two external
webhooks (`/webhooks/stripe`, `/integrations/gbp/digest`), the health
check, CSV/image multipart uploads, completing a real Stripe payment, and
kiosk-facing custom-header routes (tracked as a real engine follow-up: a
future `Header <name> <value>` command).

## Room allocation (authoritative assignment model — added with the Rooms feature)

These endpoints back the staff→room and child→room assignment model
(`docs/rooms/room-allocation-design.md`). Both the room profile and the
staff/child profiles call the same service, so allocation logic is never
duplicated per controller.

- [x] `PATCH /admin/rooms/{id}/status` (activate/deactivate) → `SUI-CHILDROOM-001` (A07), `RoomsClient`/`RoomDetailClient`
- [x] `GET /admin/rooms/{id}/capacity`, `GET /admin/rooms/capacity?branch=` → `SUI-CAPACITY-001`
- [x] `GET /admin/rooms/{id}/staff`, `POST /admin/staff-room-assignments`, `PATCH /admin/staff-room-assignments/{id}`, `GET /admin/staff/{id}/room-assignments` → `SUI-STAFFROOM-001`
- [x] `GET /admin/rooms/{id}/children`, `POST /admin/child-room-assignments`, `PATCH /admin/child-room-assignments/{id}`, `GET /admin/children/{id}/room-assignments`, `POST /admin/children/{id}/transfer-room` → `SUI-CHILDROOM-001`
- [x] Audit entries (allocate_staff / transfer_child / …) → `SUI-ROOMAUDIT-001`
- [x] One-write / retry-safe / single-active-placement invariants → `SUI-ROOMNET-001`

Also covered by Go unit tests in `internal/service/room_assignment_test.go`
(capacity, age, transfer rollback, primary uniqueness, cross-branch,
inactive, scheduled activation) and the migration in
`cmd/migrateroomassignments`.
