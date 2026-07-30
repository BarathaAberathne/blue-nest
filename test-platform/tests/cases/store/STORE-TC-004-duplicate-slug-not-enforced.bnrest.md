---
id: STORE-TC-004
number: 2.5.4
type: Test Case
title: A duplicate product slug IS rejected by a DB unique index, but surfaces as a raw 500 instead of a clean 400 (gap lock)
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

# Duplicate product slug surfaces as an unhandled 500

New coverage (`SUI-STORE-001`). Verified live against the real database: a
`slug_1` unique index on the `products` collection DOES reject the second
insert (`E11000 duplicate key error`), but `internal/repository/product.go`
doesn't detect/translate that Mongo write error into a clean `400` the way
e.g. staff's duplicate-email check does — it passes straight through as a
raw `500`. A real, currently-existing error-handling gap (a genuine
constraint IS enforced, just surfaced badly), not a fix target here.
Reads the shared `adminSession` suite fixture — see `SUI-STORE-001`.

```bnrest
Given Post /api/v1/admin/products Into first Using adminSession.accessToken
{
  "sku": "QA-AUTOTEST-DUP1-${random()}",
  "slug": "qa-autotest-dup-product-${random()}",
  "name": "QA-AUTOTEST First",
  "price": 100
}
Then AssertStatus first 201

When Post /api/v1/admin/products Into second Using adminSession.accessToken
{
  "sku": "QA-AUTOTEST-DUP2-${random()}",
  "slug": "${first.body.data.slug}",
  "name": "QA-AUTOTEST Second",
  "price": 200
}
Then AssertStatus second 500

Teardown
Delete /api/v1/admin/products/${first.body.data.id} Using adminSession.accessToken
```
