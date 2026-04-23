# Blue Nest Montessori – API Reference

Base URL: `http://localhost:8080`  
All responses use the envelope format:

```json
{ "data": <payload> }
{ "error": "message" }
```

---

## Auth

### POST /api/v1/auth/register
Register a new customer account.

**Body**
```json
{
  "email": "jane@example.com",
  "password": "securepass123",
  "first_name": "Jane",
  "last_name": "Smith"
}
```

**Response 201**
```json
{
  "data": {
    "access_token": "eyJ...",
    "user": { "id": "...", "email": "jane@example.com", "role": "customer" }
  }
}
```

---

### POST /api/v1/auth/login

**Body**
```json
{ "email": "jane@example.com", "password": "securepass123" }
```

**Response 200** — same shape as register.

---

### POST /api/v1/auth/logout
Requires `Authorization: Bearer <token>`

---

### POST /api/v1/auth/refresh
Exchange a refresh token for a new access token. *(Scaffold – not yet implemented)*

---

## Products

### GET /api/v1/products
Returns all active products.

```json
{ "data": [{ "id": "...", "name": "Sensory Kit", "price": 2499, "currency": "gbp" }] }
```

### GET /api/v1/products/:id
Returns a single product by ID.

### GET /api/v1/categories
Returns all product categories.

---

## Cart
*All cart endpoints require `Authorization: Bearer <token>`*

### GET /api/v1/cart
Returns the authenticated user's cart.

### POST /api/v1/cart/items
Add an item to the cart.

**Body**
```json
{ "product_id": "...", "qty": 1 }
```

### PUT /api/v1/cart/items/:id
Update quantity of a cart item.

### DELETE /api/v1/cart/items/:id
Remove an item from the cart.

---

## Checkout & Orders

### POST /api/v1/checkout/session
Creates a Stripe checkout session.  
Returns `{ "data": { "session_id": "cs_..." } }`.  
Redirect the user to Stripe using this session ID.

### POST /api/v1/webhooks/stripe
Receives Stripe webhook events. Validates the `Stripe-Signature` header.  
Handles: `checkout.session.completed`, `payment_intent.payment_failed`

### GET /api/v1/orders/me
Returns all orders for the authenticated user.

### GET /api/v1/orders/:id
Returns a single order (authenticated, must own the order).

---

## Blog

### GET /api/v1/blog/posts
Returns all published blog posts.

```json
{ "data": [{ "id": "...", "slug": "...", "title": "...", "excerpt": "...", "published_at": "..." }] }
```

### GET /api/v1/blog/posts/:slug
Returns a single post by slug.

---

## Branches

### GET /api/v1/branches
Returns all branches (active and coming_soon).

```json
{
  "data": [
    { "slug": "harrow", "name": "...", "status": "active", ... },
    { "slug": "northwood", "name": "...", "status": "coming_soon", ... }
  ]
}
```

### GET /api/v1/branches/:slug
Returns a single branch by slug.

---

## Admin
*All admin endpoints require `Authorization: Bearer <token>` with role `admin` or `branch_manager`.*

### GET /api/v1/admin/orders
Returns all orders.

### GET /api/v1/admin/orders/:id
Returns a single order.

### PATCH /api/v1/admin/orders/:id/status
Update an order's status.

**Body**
```json
{ "status": "shipped" }
```

Valid statuses: `pending`, `paid`, `processing`, `shipped`, `delivered`, `cancelled`

### GET /api/v1/admin/products
Returns all products (including inactive).

### POST /api/v1/admin/products
Create a new product.

**Body**
```json
{
  "name": "Sensory Kit",
  "slug": "sensory-kit",
  "description": "...",
  "price": 2499,
  "currency": "gbp",
  "stock_qty": 10,
  "is_active": true
}
```

### PUT /api/v1/admin/products/:id
Replace a product document.

### DELETE /api/v1/admin/products/:id
Soft-delete (or hard-delete) a product.

### GET /api/v1/admin/blog/posts
Returns all blog posts (including drafts).

### POST /api/v1/admin/blog/posts
Create a new blog post.

**Body**
```json
{
  "title": "...",
  "slug": "...",
  "excerpt": "...",
  "body": "...",
  "published": false,
  "tags": ["montessori", "tips"]
}
```

### PUT /api/v1/admin/blog/posts/:id
Replace a blog post document.

---

## Health

### GET /api/v1/health
```json
{ "data": { "status": "ok", "service": "blue-nest-montessori-api" } }
```
