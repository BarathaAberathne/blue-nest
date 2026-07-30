---
id: PROC-TC-010
number: 2.6.10
type: Test Case
title: A staff member can save, list and delete a reorder template; a template with no real items is rejected
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

# Order templates

New coverage (`SUI-PROCUREMENT-001`). Verified against
`internal/models/order_template.go`. Reads the shared `staffSession`/
`branch` suite fixtures — see `SUI-PROCUREMENT-001`.

```bnrest
Given Post /api/v1/order-templates Into noItems Using staffSession.accessToken
{
  "name": "QA-AUTOTEST Empty Template",
  "branch_slug": "${branch.slug}",
  "items": [{"item_name": "", "supplier": "Gompels", "qty": 1}]
}
Then AssertStatus noItems 400

When Post /api/v1/order-templates Into created Using staffSession.accessToken
{
  "name": "QA-AUTOTEST-Template-${random()}",
  "branch_slug": "${branch.slug}",
  "items": [{"item_name": "QA-AUTOTEST Standing Nappies", "supplier": "Gompels", "qty": 5}]
}
Then AssertStatus created 201

When Get /api/v1/order-templates Into list Using staffSession.accessToken
Then AssertStatus list 200
And AssertJson list "$.body.data[?(@.id=='${created.body.data.id}')].length()" == 1

When Delete /api/v1/order-templates/${created.body.data.id} Into deleted Using staffSession.accessToken
Then AssertStatus deleted 200
```
