---
id: STORE-TC-008
number: 2.5.8
type: Test Case
title: A customer can list and fetch their own orders, but not another customer's order
owner: QA
mode: Standalone
status: Active
tags:
  - store
  - regression
dependsOn: []
uses:
  - AUTH-UTIL-002
fixtureScope: case
timeoutSeconds: 30
---

# Order ownership is enforced

New coverage (`SUI-STORE-001`). `internal/handler/order.go`'s customer
`Get` compares `order.user_id` against the JWT caller — a mismatch is a
403, not a 404 (so the id's existence isn't leaked either way, but the
distinction is deliberate here, matching the real behaviour). Reads the
shared `customerSession`/`product` suite fixtures — see `SUI-STORE-001`.

```bnrest
Setup
Post /api/v1/cart/items Into added Using customerSession.accessToken
{
  "product_id": "${product.body.data.id}",
  "qty": 1
}
AssertStatus added 200

Post /api/v1/checkout/session Into checkout Using customerSession.accessToken
{
  "customer_name": "QA-AUTOTEST Ownership Customer",
  "customer_email": "${customerSession.email}",
  "customer_phone": "07000000098",
  "success_url": "https://example.test/success",
  "cancel_url": "https://example.test/cancel"
}
AssertStatus checkout 200

Call ../../utils/auth/AUTH-UTIL-002-register-customer.bnrest.md With Json Into otherCustomer
{
  "email": "qa-autotest-otherbuyer-${random()}@bluenest.test",
  "password": "OtherBuyer2027!",
  "firstName": "QA-AUTOTEST",
  "lastName": "OtherBuyer"
}

Body
When Get /api/v1/orders/me Into own Using customerSession.accessToken
Then AssertStatus own 200
And AssertJson own "$.body.data[?(@.id=='${checkout.body.data.order_id}')].length()" == 1

When Get /api/v1/orders/${checkout.body.data.order_id} Into ownFetch Using customerSession.accessToken
Then AssertStatus ownFetch 200

When Get /api/v1/orders/${checkout.body.data.order_id} Into otherFetch Using otherCustomer.accessToken
Then AssertStatus otherFetch 403
```
