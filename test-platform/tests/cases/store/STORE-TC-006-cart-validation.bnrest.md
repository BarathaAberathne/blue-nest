---
id: STORE-TC-006
number: 2.5.6
type: Test Case
title: Cart adds reject a zero/negative quantity, a nonexistent product, and a quantity beyond stock
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

# Cart add validation

New coverage (`SUI-STORE-001`). Verified against the cart service's manual
`if` checks (no struct-tag validator is actually wired up). Reads the
shared `adminSession`/`customerSession` suite fixtures — see
`SUI-STORE-001`.

```bnrest
Setup
Post /api/v1/admin/products Into lowStock Using adminSession.accessToken
{
  "sku": "QA-AUTOTEST-LOWSTOCK-${random()}",
  "slug": "qa-autotest-lowstock-${random()}",
  "name": "QA-AUTOTEST Low Stock Product",
  "price": 100,
  "stock_qty": 1,
  "is_active": true
}
AssertStatus lowStock 201

Body
When Post /api/v1/cart/items Into zeroQty Using customerSession.accessToken
{
  "product_id": "${lowStock.body.data.id}",
  "qty": 0
}
Then AssertStatus zeroQty 400

When Post /api/v1/cart/items Into unknownProduct Using customerSession.accessToken
{
  "product_id": "000000000000000000000099",
  "qty": 1
}
Then AssertStatus unknownProduct 400

When Post /api/v1/cart/items Into overStock Using customerSession.accessToken
{
  "product_id": "${lowStock.body.data.id}",
  "qty": 5
}
Then AssertStatus overStock 400

Teardown
Delete /api/v1/admin/products/${lowStock.body.data.id} Using adminSession.accessToken
```
