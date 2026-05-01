# Codex Instructions — Blue Nest Montessori Backend Implementation

## Mission

Implement the backend functionality required to make the Blue Nest Montessori eCommerce flow production-ready without changing the existing frontend visual design or layout.

The main deliverables are:

1. A working checkout cart connected to the existing frontend store page.
2. A Stripe payment gateway flow.
3. A functional admin dashboard backend for orders/products/status management.
4. Existing CTA/buttons wired to the correct routes/actions after functionality is validated.
5. Tests, validation, and documentation updates.

## Critical Guardrail: Do Not Change Frontend Design

Do **not** redesign, restyle, restructure, or visually alter the frontend pages/components.

Allowed frontend changes only:

- Add event handlers to existing buttons.
- Wire existing buttons/links/forms to API calls.
- Add missing API client functions in `frontend/lib/api.ts` or equivalent.
- Add state management needed for cart/auth/checkout while preserving existing markup and styling.
- Add loading/error/success states only where necessary, using existing UI components/classes/patterns.
- Fix broken links/CTA wiring without changing layout, colours, typography, spacing, images, animations, or component structure.

Before editing any frontend file, inspect the current component and preserve all existing class names, layout wrappers, design tokens, Tailwind classes, and content.

## Existing Project Context

The project is a monorepo:

```text
blue-nest-montessori/
├── backend/    # Go API
├── frontend/   # Next.js app
├── docs/
├── docker-compose.yml
├── Makefile
└── README.md
```

Current stack:

- Frontend: Next.js 14, React 18, TypeScript, Tailwind CSS
- Backend: Go 1.22, Chi router, REST API
- Database: MongoDB 7
- Payments: Stripe scaffolded
- Auth: JWT scaffolded
- Containers: Docker/Docker Compose

Use the existing architecture:

```text
handler -> service -> repository -> MongoDB / Stripe
```

Keep handlers thin. Put business logic in services. Put database access behind repository interfaces.

## Source of Truth

Use these files as the source of truth before coding:

1. `README.md`
2. `swagger.yaml`
3. `docs/api.md`, if present
4. Existing backend models, routes, handlers, services, repositories
5. Existing frontend `lib/api.ts`, store feature files, cart page, checkout pages, admin pages, dashboard pages

Do not invent incompatible API shapes. Match `swagger.yaml` unless the current implementation already has a more complete compatible shape.


## Product Catalogue Seed Data

A product catalogue CSV is available at the repository/root working context as:

```text
catalog_products.csv
```

Use this CSV to create realistic local development/sample products for the store and admin dashboard. Do **not** hardcode these products into frontend components. Import them into MongoDB through a backend seed/import script so the existing store page continues to read products through the API.

### CSV Fields to Support

The CSV follows a Wix-style catalogue export shape. At minimum, map these fields into the backend `Product` model/DTO:

| CSV column | Backend mapping | Notes |
|---|---|---|
| `handleId` | `external_id` or `source_id` | Preserve for idempotent imports/upserts. |
| `fieldType` | import filter | Only import rows where `fieldType == Product`. |
| `name` | `name` | Required. |
| `description` | `description` | CSV contains HTML; sanitise/strip HTML for plain-text fields or store safely if the model supports rich text. Never render unsafe HTML directly. |
| `productImageUrl` | `image_url` / `images[0]` | Existing values may be Wix media filenames, not full URLs. Keep as-is for seed data unless local image mapping exists. |
| `collection` | `category` / `collection` | Use to group products, e.g. Holiday Club Harrow, Holiday Club Pinner, Schoolwear. |
| `sku` | `sku` | Generate a stable slug/SKU if blank. |
| `price` | `price` | Store as integer minor units where possible, e.g. pounds to pence. |
| `visible` | `is_active` / `visible` | Only show visible products in public API responses. |
| `inventory` | `stock_status` | Map `InStock` to available/in-stock. |
| `discountMode`, `discountValue` | discount fields | Optional; default discount to zero if missing. |
| `brand` | `brand` | Optional. |

The uploaded catalogue currently includes sample products such as:

- Holiday Club Harrow sessions
- Holiday Club Pinner sessions
- Schoolwear products: Book Bag, String Bag, Sweatshirt, Polo Shirt, Woolly Hat

### Required Backend Import Work

Implement a backend-safe seeding/import path:

1. Add a CSV import/seed script under an appropriate backend location, for example:

```text
backend/cmd/seed-products/main.go
```

2. The script must:

- Read `catalog_products.csv` from a configurable path, defaulting to the repo root or `/data/catalog_products.csv` in Docker.
- Connect to MongoDB using existing config loading patterns.
- Parse CSV using Go's standard `encoding/csv`.
- Handle UTF-8 BOM safely.
- Import only `fieldType=Product` rows.
- Validate required fields: `handleId`, `name`, `price`.
- Convert price to the backend's expected money format. Prefer integer pence/minor units over floating point.
- Generate a stable product slug from `name` if the CSV has no slug.
- Generate a fallback SKU when `sku` is empty, using collection/name/handleId in a deterministic way.
- Derive branch slugs from collection names where possible:
  - `Holiday club Harrow` -> `branch_slugs: ["harrow"]`
  - `Holiday club Pinner` -> `branch_slugs: ["pinner"]`
  - `Schoolwear` -> all active branches or empty/global depending on the existing model convention.
- Upsert products by `external_id`/`handleId` or slug so repeated imports are idempotent.
- Skip invalid rows with clear logs, but fail the command if no valid rows are imported.
- Print a summary: imported, updated, skipped, failed.

3. Add a Makefile command if appropriate, without breaking existing commands:

```make
seed-products:
	cd backend && go run ./cmd/seed-products --file ../catalog_products.csv
```

4. Update `.env` only if a new config value is needed.

5. Do not add test/demo product arrays inside the frontend.

### Public Store API Behaviour

After importing the CSV data:

- `GET /api/v1/products` should return active/visible products.
- Public product listing must support grouping/filtering by collection/category if the existing frontend expects it.
- Holiday Club products should appear as normal purchasable products.
- Schoolwear products should appear as normal purchasable products.
- Out-of-stock or invisible items should not be shown publicly unless the existing API explicitly supports admin-only visibility.

### Admin Dashboard Behaviour

The existing/admin product pages should be wired to backend product APIs so the imported catalogue can be viewed and managed from the dashboard.

Admin product requirements:

- List imported products.
- View product detail.
- Update product visibility/status/stock where existing UI supports it.
- Preserve imported `external_id` for traceability.
- Do not delete or overwrite imported records accidentally when re-running the seed.

### Tests for CSV Product Import

Add tests around the product import logic:

- Given a valid CSV row, when imported, then a product is created with name, price, category, branch slug and visibility populated.
- Given the same CSV is imported twice, when upsert runs, then duplicate products are not created.
- Given a Holiday Club Harrow product, when imported, then `branch_slugs` contains `harrow`.
- Given a Holiday Club Pinner product, when imported, then `branch_slugs` contains `pinner`.
- Given a Schoolwear product, when imported, then it is treated as global/all-branch according to the existing model convention.
- Given a row with missing name or invalid price, when imported, then it is skipped with a clear error.

### Frontend Guardrail for Product Data

The CSV should improve data availability only. Do not change the existing nursery-store design/layout to fit the data. If the product names/descriptions are long, handle that through existing truncation/card patterns already present in the UI.

## API Base Path

The API base path should remain:

```text
/api/v1
```

Expected local services:

```text
Frontend: http://localhost:3000
API:      http://localhost:8080
MongoDB:  localhost:27017
```

## Required API Endpoints

Implement or complete the following backend endpoints.

### Health

```http
GET /api/v1/health
```

### Auth

```http
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/logout
POST /api/v1/auth/refresh
```

Minimum requirement for this phase:

- Customers can authenticate enough to own a cart/order.
- Admin routes are protected by admin/branch_manager role checks.
- Do not store plain text passwords.
- JWT claims should include user id, email, role, and optional branch slugs.

### Products and Categories

```http
GET /api/v1/products
GET /api/v1/products/{id}
GET /api/v1/categories
```

Requirements:

- Public store page must load real products from MongoDB/API.
- Only active products should be returned publicly.
- Product data should include id, slug/name, price, image URL(s), description, category, stock, active status, and branch slugs where available.
- Use integer minor units for money internally, for example pence, to avoid floating point errors.

### Cart

```http
GET    /api/v1/cart
POST   /api/v1/cart/items
PUT    /api/v1/cart/items/{id}
DELETE /api/v1/cart/items/{id}
```

Requirements:

- Cart belongs to authenticated user.
- If the frontend currently supports anonymous cart state, preserve that behaviour visually and merge/submit it after login where practical.
- Adding a product validates that the product exists, is active, and has sufficient stock if stock tracking exists.
- Updating quantity must reject zero/negative quantities unless the existing API expects zero to remove.
- Removing an item returns the updated cart.
- Cart totals must be calculated server-side.
- Never trust frontend-submitted product price.

### Checkout and Stripe

```http
POST /api/v1/checkout/session
POST /api/v1/webhooks/stripe
```

Requirements:

- `POST /checkout/session` creates a Stripe Checkout Session from the authenticated user’s current cart.
- Request body accepts:

```json
{
  "success_url": "http://localhost:3000/checkout/success",
  "cancel_url": "http://localhost:3000/checkout/cancel"
}
```

- Response body returns:

```json
{
  "session_id": "cs_test_...",
  "url": "https://checkout.stripe.com/..."
}
```

- Create an order in MongoDB before redirecting to Stripe, with status `pending`.
- Store Stripe session id on the order.
- Use Stripe line items based on server-side product prices.
- Include order id/user id in Stripe metadata.
- `checkout.session.completed` webhook should mark the order as `paid`.
- Webhook must verify Stripe signature using `STRIPE_WEBHOOK_SECRET`.
- Webhook handling should be idempotent. Repeated events must not duplicate orders or corrupt state.
- After successful payment, clear the user cart or mark it as checked out.

### Customer Orders

```http
GET /api/v1/orders/me
GET /api/v1/orders/{id}
```

Requirements:

- Customers can list only their own orders.
- Customers cannot read another user’s order.
- `GET /orders/{id}` must return `403` for authenticated users trying to access another user’s order and `404` if order does not exist.

### Admin Orders

```http
GET   /api/v1/admin/orders
GET   /api/v1/admin/orders/{id}
PATCH /api/v1/admin/orders/{id}/status
```

Requirements:

- Admin dashboard should display real order totals and recent orders.
- Admin order list supports pagination and optional status filter.
- Admin can open an order detail view.
- Admin can update status using only valid statuses:

```text
pending, paid, processing, shipped, delivered, cancelled
```

- Branch manager role, if already present, should only see/manage orders for their allowed branch slugs.

### Admin Products

```http
GET    /api/v1/admin/products
POST   /api/v1/admin/products
PUT    /api/v1/admin/products/{id}
DELETE /api/v1/admin/products/{id}
```

Requirements:

- Existing admin products page should connect to real backend data.
- Create/update must validate required fields and price.
- Delete should prefer soft delete/deactivate unless the existing model already supports hard delete safely.
- Public `/products` must not show inactive/deleted products.

### Admin Dashboard CTA/Button Wiring

After the backend works and tests pass, wire existing buttons/CTAs without changing visual design.

Examples:

- Store product “Add to cart” -> `POST /cart/items`
- Cart quantity controls -> `PUT /cart/items/{id}`
- Cart remove button -> `DELETE /cart/items/{id}`
- Checkout button -> `POST /checkout/session`, then redirect to returned Stripe URL
- Admin dashboard “View orders” -> `/admin/orders`
- Admin dashboard “Manage products” -> `/admin/products`
- Admin order status controls -> `PATCH /admin/orders/{id}/status`
- Account/order CTA -> `/account/orders` backed by `GET /orders/me`
- Any existing dashboard cards/buttons that are currently placeholders should route to the correct existing admin pages or API-backed action.

Do not add new visual sections unless required for functionality. If adding a missing button state, match existing component patterns exactly.

## Data Model Guidance

Use or adapt existing models where present. If missing, add models compatible with this shape.

### User

```go
type User struct {
    ID           primitive.ObjectID `bson:"_id,omitempty" json:"id"`
    Email        string             `bson:"email" json:"email"`
    PasswordHash string             `bson:"password_hash" json:"-"`
    FirstName    string             `bson:"first_name" json:"first_name"`
    LastName     string             `bson:"last_name" json:"last_name"`
    Role         string             `bson:"role" json:"role"` // customer, admin, branch_manager
    BranchSlugs  []string           `bson:"branch_slugs,omitempty" json:"branch_slugs,omitempty"`
    CreatedAt    time.Time          `bson:"created_at" json:"created_at"`
    UpdatedAt    time.Time          `bson:"updated_at" json:"updated_at"`
}
```

### Product

```go
type Product struct {
    ID          primitive.ObjectID `bson:"_id,omitempty" json:"id"`
    Name        string             `bson:"name" json:"name"`
    Slug        string             `bson:"slug" json:"slug"`
    Description string             `bson:"description" json:"description"`
    PricePence  int64              `bson:"price_pence" json:"price_pence"`
    Currency    string             `bson:"currency" json:"currency"`
    CategoryID  string             `bson:"category_id,omitempty" json:"category_id,omitempty"`
    ImageURL    string             `bson:"image_url,omitempty" json:"image_url,omitempty"`
    Stock       int                `bson:"stock" json:"stock"`
    Active      bool               `bson:"active" json:"active"`
    BranchSlugs []string           `bson:"branch_slugs,omitempty" json:"branch_slugs,omitempty"`
    CreatedAt   time.Time          `bson:"created_at" json:"created_at"`
    UpdatedAt   time.Time          `bson:"updated_at" json:"updated_at"`
}
```

### Cart

```go
type Cart struct {
    ID         primitive.ObjectID `bson:"_id,omitempty" json:"id"`
    UserID     primitive.ObjectID `bson:"user_id" json:"user_id"`
    Items      []CartItem         `bson:"items" json:"items"`
    TotalPence int64              `bson:"total_pence" json:"total_pence"`
    Currency   string             `bson:"currency" json:"currency"`
    UpdatedAt  time.Time          `bson:"updated_at" json:"updated_at"`
}

type CartItem struct {
    ID              primitive.ObjectID `bson:"_id,omitempty" json:"id"`
    ProductID       primitive.ObjectID `bson:"product_id" json:"product_id"`
    ProductName     string             `bson:"product_name" json:"product_name"`
    Quantity        int                `bson:"quantity" json:"quantity"`
    UnitPricePence  int64              `bson:"unit_price_pence" json:"unit_price_pence"`
    LineTotalPence  int64              `bson:"line_total_pence" json:"line_total_pence"`
    ImageURL        string             `bson:"image_url,omitempty" json:"image_url,omitempty"`
}
```

### Order

```go
type Order struct {
    ID              primitive.ObjectID `bson:"_id,omitempty" json:"id"`
    UserID          primitive.ObjectID `bson:"user_id" json:"user_id"`
    Items           []OrderItem        `bson:"items" json:"items"`
    Status          string             `bson:"status" json:"status"`
    PaymentStatus   string             `bson:"payment_status" json:"payment_status"`
    TotalPence      int64              `bson:"total_pence" json:"total_pence"`
    Currency        string             `bson:"currency" json:"currency"`
    StripeSessionID string             `bson:"stripe_session_id,omitempty" json:"stripe_session_id,omitempty"`
    StripePaymentID string             `bson:"stripe_payment_id,omitempty" json:"stripe_payment_id,omitempty"`
    BranchSlugs     []string           `bson:"branch_slugs,omitempty" json:"branch_slugs,omitempty"`
    CreatedAt       time.Time          `bson:"created_at" json:"created_at"`
    UpdatedAt       time.Time          `bson:"updated_at" json:"updated_at"`
}
```

## MongoDB Indexes

Add an index setup function that runs at startup.

Required indexes:

- `users.email` unique
- `products.slug` unique
- `products.active`
- `products.branch_slugs`
- `carts.user_id` unique
- `orders.user_id`
- `orders.status`
- `orders.stripe_session_id` unique sparse
- `orders.created_at`
- `branches.slug` unique, if branch collection exists
- `blog_posts.slug` unique, if blog collection exists

## Stripe Configuration

Use environment variables:

```text
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_PUBLISHABLE_KEY
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
```

Do not commit real secrets.

Local webhook testing command:

```bash
stripe listen --forward-to localhost:8080/api/v1/webhooks/stripe
```

Use Stripe test cards only.

## Implementation Plan for Codex

Follow this order. Do not skip validation steps.

### Phase 1 — Inspect Existing Code

1. Read `README.md`, `swagger.yaml`, and `docs/api.md` if present.
2. Inspect backend folders:
   - `backend/internal/models`
   - `backend/internal/routes`
   - `backend/internal/handler`
   - `backend/internal/service`
   - `backend/internal/repository`
   - `backend/internal/platform/stripe`
   - `backend/internal/middleware`
3. Inspect frontend integration points only:
   - `frontend/lib/api.ts`
   - `frontend/features/store`
   - `frontend/app/nursery-store`
   - `frontend/app/cart`
   - `frontend/app/checkout/success`
   - `frontend/app/checkout/cancel`
   - `frontend/app/admin/dashboard`
   - `frontend/app/admin/orders`
   - `frontend/app/admin/products`
4. Write down what already exists and only fill gaps.

### Phase 2 — Backend Foundation

1. Complete config loading for Stripe, JWT, MongoDB, CORS/frontend URL.
2. Complete Mongo connection and graceful shutdown if missing.
3. Add index creation at startup.
4. Make sure routes are registered under `/api/v1`.
5. Ensure JSON response format is consistent with existing response helpers.

### Phase 3 — Products and Cart

1. Implement product repository methods.
2. Implement cart repository methods.
3. Implement cart service:
   - get or create cart
   - add item
   - update item quantity
   - remove item
   - recalculate totals server-side
4. Implement handlers and route registration.
5. Add tests for normal and failure paths.

### Phase 4 — Checkout and Orders

1. Implement order repository.
2. Implement checkout service:
   - validate cart
   - create pending order
   - create Stripe checkout session
   - save Stripe session id
3. Implement Stripe webhook handler:
   - verify signature
   - handle `checkout.session.completed`
   - update order to paid
   - clear cart
   - idempotent behaviour
4. Implement customer order endpoints.
5. Add tests.

### Phase 5 — Admin Dashboard Backend

1. Implement admin order list/detail/status endpoints.
2. Implement admin product CRUD endpoints.
3. Enforce role authorization.
4. Support branch manager scoping if role/branch slugs exist.
5. Add tests.

### Phase 6 — Frontend Wiring Only

Do this after backend endpoints pass tests.

1. Add typed API methods to `frontend/lib/api.ts`.
2. Wire store page existing buttons to add items to cart.
3. Wire cart page to backend cart endpoints.
4. Wire checkout button to backend checkout session endpoint and redirect to returned Stripe URL.
5. Wire account orders page to customer orders endpoint.
6. Wire admin dashboard cards/buttons to existing admin pages/API data.
7. Wire admin orders/products pages to backend endpoints.
8. Preserve all existing design, layout, classes, copy, images, and animation patterns.

### Phase 7 — Validation

Run:

```bash
make test
make lint
make build
```

If Docker is available:

```bash
make docker-build
make docker-up
```

Then manually validate:

1. Public product listing loads from API.
2. Add to cart works.
3. Cart quantity update works.
4. Cart remove works.
5. Checkout redirects to Stripe test checkout.
6. Stripe success returns to `/checkout/success`.
7. Webhook marks order as `paid`.
8. Cart clears after successful payment.
9. Customer can see the order in `/account/orders`.
10. Admin dashboard shows orders/products.
11. Admin can update order status.
12. Public UI layout has not visually changed.

## Test Requirements

Add table-driven Go tests where practical.

Minimum backend test coverage:

### Cart Tests

- get empty cart creates or returns empty cart
- add valid item
- add invalid product id returns 400/404
- add inactive product returns 400
- update quantity recalculates totals
- update invalid quantity returns 400
- remove item returns updated cart
- cart total cannot be manipulated by frontend price

### Checkout Tests

- empty cart returns 400
- valid cart creates pending order
- Stripe session creation failure returns 500 and does not leave corrupt order state
- success response includes session id and URL

### Stripe Webhook Tests

- invalid signature returns 400
- unhandled event returns 200 without side effects
- completed checkout marks order paid
- duplicate completed event is idempotent
- missing order metadata/session returns safe error/logging

### Orders Tests

- user can list own orders
- user can read own order
- user cannot read another user’s order
- admin can list all orders
- branch manager only sees scoped branch orders, if branch manager support exists
- invalid status update returns 400
- valid status update returns updated order

### Admin Products Tests

- admin can create product
- validation catches missing name/price
- admin can update product
- delete/deactivate hides product from public listing
- non-admin is rejected

## Error Handling Rules

Use consistent status codes:

- `400` invalid request/invalid quantity/empty cart
- `401` missing or invalid authentication
- `403` authenticated but not allowed
- `404` product/cart item/order not found
- `409` duplicate unique value, such as email or slug
- `500` unexpected server/Stripe/database error

Do not leak internal errors or secrets in API responses.

## Security Requirements

- Never trust frontend price or totals.
- Validate product id and quantity server-side.
- Protect admin routes with role middleware.
- Verify Stripe webhook signatures.
- Keep Stripe secret and webhook secret in environment variables.
- Use bcrypt/secure password hashing if auth is implemented or completed.
- Avoid logging full JWTs, passwords, Stripe secrets, or card/payment details.

## Documentation Updates

Update documentation only where needed:

- `README.md`: setup and testing notes if implementation changes existing commands.
- `.env`: include any missing env vars.
- `docs/api.md`: update implemented request/response examples if stale.
- `swagger.yaml`: only update if actual implemented contract differs intentionally.

## Acceptance Criteria

The task is complete only when all of these are true:

- Backend compiles.
- Backend tests pass.
- Frontend build passes.
- Store page can load products from API.
- Existing store “Add to cart” action works without visual changes.
- Cart page shows server-backed cart data.
- Checkout creates a Stripe session and redirects correctly.
- Stripe webhook marks orders as paid.
- Customer can view their orders.
- Admin dashboard/order/product pages are backed by API data.
- Dashboard CTAs/buttons navigate or call the correct functionality.
- Existing frontend layout/design remains unchanged.
- `.env` and docs are updated if required.

## Final Report Required from Codex

When finished, provide a concise implementation report with:

1. Files changed.
2. Endpoints implemented.
3. Tests added/updated.
4. Commands run and results.
5. Manual validation checklist result.
6. Any remaining limitations or TODOs.

Do not mark the work complete if any build/test command fails. Fix the failure or clearly document the blocker.
