---
id: STORE-TC-009
number: 2.5.9
type: Test Case
title: Admin order-status updates accept any string, with no whitelist or state-machine validation (gap lock)
owner: QA
mode: Standalone
status: Active
tags:
  - store
  - regression
dependsOn: []
uses: []
fixtureScope: case
timeoutSeconds: 30
---

# Order status has no state machine (gap lock)

New coverage (`SUI-STORE-001`), a documented gap: `PATCH
/admin/orders/{id}/status` does a raw `$set` with no validation against a
known status list. Not a fix target here. Reads the
shared `adminSession`/`customerSession`/`product` suite fixtures — see
`SUI-STORE-001`.

```bnrest
Given Post /api/v1/cart/items Into added Using customerSession.accessToken
{
  "product_id": "${product.body.data.id}",
  "qty": 1
}
Then AssertStatus added 200

When Post /api/v1/checkout/session Into checkout Using customerSession.accessToken
{
  "customer_name": "QA-AUTOTEST Status Customer",
  "customer_email": "${customerSession.email}",
  "customer_phone": "07000000097",
  "success_url": "https://example.test/success",
  "cancel_url": "https://example.test/cancel"
}
Then AssertStatus checkout 200

When Patch /api/v1/admin/orders/${checkout.body.data.order_id}/status Into patched Using adminSession.accessToken
{
  "status": "qa-autotest-not-a-real-status"
}
Then AssertStatus patched 200

When Get /api/v1/admin/orders/${checkout.body.data.order_id} Into after Using adminSession.accessToken
Then AssertStatus after 200
And Assert after.body.data.status == "qa-autotest-not-a-real-status"
```
