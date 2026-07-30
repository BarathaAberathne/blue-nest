---
id: SUI-STORE-001
number: "2.5"
type: Test Suite
title: Store (Products, Categories, Cart, Checkout, Orders)
owner: QA
mode: Standalone
status: Active
tags:
  - store
---

# Store suite

New coverage (no legacy equivalent). Verified against
`internal/models/{product,cart,order}.go`,
`internal/handler/{product,cart,checkout,order}.go`,
`internal/handler/admin/{products,categories,orders}.go`.

**CSV product import (`POST /admin/products/import`) and blog-style image
upload are not covered** — both need a real multipart file body, which
this engine's REST commands don't support (JSON bodies only); a real
platform-capability gap, documented rather than silently skipped (same
note as `SUI-BLOG-001`). **Completing a real Stripe payment is also not
attempted** — only session creation + the pending-order side effect are
HTTP-testable without a signed Stripe webhook payload or a browser driving
the Stripe-hosted page (see `STORE-TC-007`'s own note).

`Setup` creates one admin login, one fresh customer registration (via
`AUTH-UTIL-002`, since `/auth/register` is a different endpoint from the
admin login `AUTH-UTIL-001` wraps), and one shared active product with
real stock.

```bnrest
Setup
Call ../../utils/auth/AUTH-UTIL-001-login.bnrest.md With Json Into adminSession
{
  "email": "admin@bluenest.uk",
  "password": "${secret:QA_ADMIN_PASSWORD}"
}

Call ../../utils/auth/AUTH-UTIL-002-register-customer.bnrest.md With Json Into customerSession
{
  "email": "qa-autotest-storecustomer-${random()}@bluenest.test",
  "password": "StoreCustomer2027!",
  "firstName": "QA-AUTOTEST",
  "lastName": "StoreCustomer"
}

Post /api/v1/admin/products Into product Using adminSession.accessToken
{
  "sku": "QA-AUTOTEST-SHARED-${random()}",
  "slug": "qa-autotest-shared-product-${random()}",
  "name": "QA-AUTOTEST Shared Product",
  "price": 1500,
  "stock_qty": 100,
  "is_active": true
}
AssertStatus product 201

Body
Call CatchError ../../cases/store/STORE-TC-001-create-product-and-category.bnrest.md
Call CatchError ../../cases/store/STORE-TC-002-public-product-visibility.bnrest.md
Call CatchError ../../cases/store/STORE-TC-003-unknown-field-rejected.bnrest.md
Call CatchError ../../cases/store/STORE-TC-004-duplicate-slug-not-enforced.bnrest.md
Call CatchError ../../cases/store/STORE-TC-005-cart-add-update-remove.bnrest.md
Call CatchError ../../cases/store/STORE-TC-006-cart-validation.bnrest.md
Call CatchError ../../cases/store/STORE-TC-007-checkout-creates-pending-order.bnrest.md
Call CatchError ../../cases/store/STORE-TC-008-order-ownership-enforced.bnrest.md
Call CatchError ../../cases/store/STORE-TC-009-order-status-no-state-machine.bnrest.md

Teardown
Delete /api/v1/admin/products/${product.body.data.id} Using adminSession.accessToken
```
