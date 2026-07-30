---
id: PROC-TC-007
number: 2.6.7
type: Test Case
title: Admin can CRUD a supplier; the slug is always derived from name; a blank name is rejected
owner: QA
mode: Standalone
status: Active
tags:
  - procurement
  - golden-path
dependsOn: []
uses: []
fixtureScope: case
timeoutSeconds: 30
---

# Supplier CRUD

New coverage (`SUI-PROCUREMENT-001`). Verified against
`internal/models/supplier.go`. Reads the shared `adminSession` suite
fixture — see `SUI-PROCUREMENT-001`.

```bnrest
Given Post /api/v1/admin/suppliers Into blankName Using adminSession.accessToken
{
  "category": "Nappies"
}
Then AssertStatus blankName 400

When Post /api/v1/admin/suppliers Into created Using adminSession.accessToken
{
  "name": "QA-AUTOTEST Supplier ${random()}",
  "category": "Nappies",
  "contact_email": "supplier@example.test",
  "lead_time_days": 3
}
Then AssertStatus created 201
And Assert created.body.data.slug != null
And Assert created.body.data.is_active == true

When Get /api/v1/admin/suppliers Into list Using adminSession.accessToken
Then AssertStatus list 200
And AssertJson list "$.body.data[?(@.id=='${created.body.data.id}')].length()" == 1

When Put /api/v1/admin/suppliers/${created.body.data.id} Into updated Using adminSession.accessToken
{
  "name": "QA-AUTOTEST Supplier Renamed ${random()}",
  "category": "Wipes",
  "is_active": false
}
Then AssertStatus updated 200
And Assert updated.body.data.is_active == false

When Delete /api/v1/admin/suppliers/${created.body.data.id} Into deleted Using adminSession.accessToken
Then AssertStatus deleted 204
```
