---
id: PROC-TC-005
number: 2.6.5
type: Test Case
title: Admin can CRUD a catalogue item; staff only ever see active items; a blank name is rejected
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

# Catalogue CRUD and active-only staff visibility

New coverage (`SUI-PROCUREMENT-001`). Verified against
`internal/models/catalogue_item.go`/`internal/service/catalogue_item.go`.
Reads the shared `adminSession`/`staffSession` suite fixtures — see
`SUI-PROCUREMENT-001`.

```bnrest
Given Post /api/v1/admin/catalogue Into blankName Using adminSession.accessToken
{
  "name": "",
  "category": "Nappies",
  "offers": []
}
Then AssertStatus blankName 400

When Post /api/v1/admin/catalogue Into active Using adminSession.accessToken
{
  "name": "QA-AUTOTEST-Catalogue-Active-${random()}",
  "category": "Nappies",
  "offers": [{"supplier": "Gompels", "code": "GMP-001", "pack_size": "1x100", "price": 999}]
}
Then AssertStatus active 201

When Post /api/v1/admin/catalogue Into inactive Using adminSession.accessToken
{
  "name": "QA-AUTOTEST-Catalogue-Inactive-${random()}",
  "category": "Nappies",
  "is_active": false,
  "offers": [{"supplier": "Gompels", "code": "GMP-002", "pack_size": "1x100", "price": 899}]
}
Then AssertStatus inactive 201

When Get /api/v1/catalogue Into staffView Using staffSession.accessToken
Then AssertStatus staffView 200
And AssertJson staffView "$.body.data[?(@.id=='${active.body.data.id}')].length()" == 1
And AssertJson staffView "$.body.data[?(@.id=='${inactive.body.data.id}')].length()" == 0

When Put /api/v1/admin/catalogue/${active.body.data.id} Into updated Using adminSession.accessToken
{
  "name": "QA-AUTOTEST-Catalogue-Active-Renamed-${random()}",
  "category": "Nappies",
  "offers": [{"supplier": "Gompels", "code": "GMP-001", "pack_size": "1x100", "price": 1099}]
}
Then AssertStatus updated 200

Teardown
Delete /api/v1/admin/catalogue/${active.body.data.id} Using adminSession.accessToken
Delete /api/v1/admin/catalogue/${inactive.body.data.id} Using adminSession.accessToken
```
