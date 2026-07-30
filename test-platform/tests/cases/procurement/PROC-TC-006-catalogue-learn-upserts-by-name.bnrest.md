---
id: PROC-TC-006
number: 2.6.6
type: Test Case
title: Learn upserts a catalogue item by name, and requires both name and code
owner: QA
mode: Standalone
status: Active
tags:
  - procurement
dependsOn: []
uses: []
fixtureScope: case
timeoutSeconds: 30
---

# Catalogue learn upserts by name

New coverage (`SUI-PROCUREMENT-001`). Verified against
`internal/service/catalogue_item.go`'s `Learn`/`UpsertByName`. Reads the
shared `adminSession` suite fixture — see `SUI-PROCUREMENT-001`.

```bnrest
Set learnSuffix = random()

Given Post /api/v1/admin/catalogue/learn Into missingCode Using adminSession.accessToken
{
  "name": "QA-AUTOTEST-Learned-${learnSuffix}",
  "price": 500
}
Then AssertStatus missingCode 400

When Post /api/v1/admin/catalogue/learn Into learned Using adminSession.accessToken
{
  "name": "QA-AUTOTEST-Learned-${learnSuffix}",
  "code": "GMP-LEARNED-001",
  "price": 500
}
Then AssertStatus learned 200

When Get /api/v1/catalogue Into staffView Using adminSession.accessToken
Then AssertStatus staffView 200
And AssertJson staffView "$.body.data[?(@.name=='${learned.body.data.name}')].length()" == 1

Teardown
Delete /api/v1/admin/catalogue/${learned.body.data.id} Using adminSession.accessToken
```
