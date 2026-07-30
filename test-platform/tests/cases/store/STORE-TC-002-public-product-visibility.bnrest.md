---
id: STORE-TC-002
number: 2.5.2
type: Test Case
title: An active product is publicly visible by list, slug, and id; an inactive one is not
owner: QA
mode: Standalone
status: Active
tags:
  - store
dependsOn: []
uses: []
fixtureScope: case
timeoutSeconds: 30
---

# Public product visibility

New coverage (`SUI-STORE-001`). `GET /products`/`/products/slug/{slug}`/
`/products/{id}` (`internal/handler/product.go`) only ever return
`is_active:true` products. Reads the shared `adminSession` suite fixture
— see `SUI-STORE-001`.

```bnrest
Given Post /api/v1/admin/products Into activeProduct Using adminSession.accessToken
{
  "sku": "QA-AUTOTEST-ACTIVE-${random()}",
  "slug": "qa-autotest-active-${random()}",
  "name": "QA-AUTOTEST Active Product",
  "price": 500,
  "is_active": true
}
Then AssertStatus activeProduct 201

When Post /api/v1/admin/products Into inactiveProduct Using adminSession.accessToken
{
  "sku": "QA-AUTOTEST-INACTIVE-${random()}",
  "slug": "qa-autotest-inactive-${random()}",
  "name": "QA-AUTOTEST Inactive Product",
  "price": 500,
  "is_active": false
}
Then AssertStatus inactiveProduct 201

When Get /api/v1/products Into publicList
Then AssertStatus publicList 200
And AssertJson publicList "$.body.data[?(@.id=='${activeProduct.body.data.id}')].length()" == 1
And AssertJson publicList "$.body.data[?(@.id=='${inactiveProduct.body.data.id}')].length()" == 0

When Get /api/v1/products/slug/${activeProduct.body.data.slug} Into bySlug
Then AssertStatus bySlug 200
And Assert bySlug.body.data.id == activeProduct.body.data.id

When Get /api/v1/products/slug/${inactiveProduct.body.data.slug} Into inactiveBySlug
Then AssertStatus inactiveBySlug 404

Teardown
Delete /api/v1/admin/products/${activeProduct.body.data.id} Using adminSession.accessToken
Delete /api/v1/admin/products/${inactiveProduct.body.data.id} Using adminSession.accessToken
```
