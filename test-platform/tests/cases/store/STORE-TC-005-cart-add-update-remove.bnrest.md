---
id: STORE-TC-005
number: 2.5.5
type: Test Case
title: A customer can add, update the quantity of, and remove a cart item
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

# Cart add/update/remove

New coverage (`SUI-STORE-001`). `internal/models/cart.go` — a cart item is
keyed by `(product_id, size)`. Reads the shared `adminSession`/
`customerSession`/`product` suite fixtures — see `SUI-STORE-001`.

```bnrest
Given Post /api/v1/cart/items Into added Using customerSession.accessToken
{
  "product_id": "${product.body.data.id}",
  "qty": 2
}
Then AssertStatus added 200
CopyJson added "$.body.data.items[?(@.product_id=='${product.body.data.id}')]" Into addedItem
Then Assert addedItem.qty == 2

When Put /api/v1/cart/items/${product.body.data.id} Into updated Using customerSession.accessToken
{
  "qty": 5
}
Then AssertStatus updated 200
CopyJson updated "$.body.data.items[?(@.product_id=='${product.body.data.id}')]" Into updatedItem
Then Assert updatedItem.qty == 5

When Delete /api/v1/cart/items/${product.body.data.id} Into removed Using customerSession.accessToken
Then AssertStatus removed 200
And AssertJson removed "$.body.data.items[?(@.product_id=='${product.body.data.id}')].length()" == 0

When Get /api/v1/cart Into cart Using customerSession.accessToken
Then AssertStatus cart 200
```
