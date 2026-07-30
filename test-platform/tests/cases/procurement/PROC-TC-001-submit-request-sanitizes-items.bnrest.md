---
id: PROC-TC-001
number: 2.6.1
type: Test Case
title: Submitting a supply request sanitizes items (blank names dropped, qty clamped, blank supplier defaults) and rejects an all-blank list
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

# Submit a supply request with sanitized items

New coverage (`SUI-PROCUREMENT-001`, no legacy equivalent). Verified
against `internal/service/order_request.go`. Reads the shared
`adminSession`/`staffSession`/`branch` suite fixtures — see
`SUI-PROCUREMENT-001`.

```bnrest
Given Post /api/v1/order-requests Into created Using staffSession.accessToken
{
  "branch_slug": "${branch.slug}",
  "classroom": "QA-AUTOTEST Room",
  "priority": "not-a-real-priority",
  "notes": "QA-AUTOTEST request",
  "items": [
    {"item_name": "", "supplier": "Gompels", "qty": 3},
    {"item_name": "Nappies", "supplier": "", "qty": 0}
  ]
}
Then AssertStatus created 201
And Assert created.body.data.ref != null
CopyJson created "$.body.data.items[?(@.item_name=='Nappies')]" Into nappies
Then Assert nappies.supplier == "Other"
And Assert nappies.qty == 1
And Assert created.body.data.priority == "normal"

When Post /api/v1/order-requests Into allBlank Using staffSession.accessToken
{
  "branch_slug": "${branch.slug}",
  "items": [
    {"item_name": "", "supplier": "Gompels", "qty": 1}
  ]
}
Then AssertStatus allBlank 400
```
