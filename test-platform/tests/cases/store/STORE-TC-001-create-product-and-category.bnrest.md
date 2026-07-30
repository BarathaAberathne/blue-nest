---
id: STORE-TC-001
number: 2.5.1
type: Test Case
title: An admin can create a product and a category
owner: QA
mode: Standalone
status: Active
tags:
  - store
  - golden-path
dependsOn: []
uses: []
fixtureScope: case
timeoutSeconds: 30
---

# Create a product and a category

New coverage (`SUI-STORE-001`, no legacy equivalent). Verified against
`internal/models/product.go`. Reads the shared `adminSession` suite
fixture — see `SUI-STORE-001`.

```bnrest
Given Post /api/v1/admin/categories Into category Using adminSession.accessToken
{
  "slug": "qa-autotest-category-${random()}",
  "name": "QA-AUTOTEST Category"
}
Then AssertStatus category 201
And Assert category.body.data.id != null

When Post /api/v1/admin/products Into product Using adminSession.accessToken
{
  "sku": "QA-AUTOTEST-${random()}",
  "slug": "qa-autotest-product-${random()}",
  "name": "QA-AUTOTEST Product",
  "description": "A test product",
  "price": 1999,
  "currency": "GBP",
  "category": "${category.body.data.name}",
  "category_id": "${category.body.data.id}",
  "stock_qty": 10,
  "is_active": true
}
Then AssertStatus product 201
And Assert product.body.data.id != null
And Assert product.body.data.price == 1999

Teardown
Delete /api/v1/admin/products/${product.body.data.id} Using adminSession.accessToken
Delete /api/v1/admin/categories/${category.body.data.id} Using adminSession.accessToken
```
