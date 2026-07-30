---
id: PROC-TC-003
number: 2.6.3
type: Test Case
title: A staff member can cancel their own pending request, but not once it is no longer pending
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

# Cancel own pending request

New coverage (`SUI-PROCUREMENT-001`). Reads the shared `adminSession`/
`staffSession`/`branch` suite fixtures — see `SUI-PROCUREMENT-001`.

```bnrest
Given Post /api/v1/order-requests Into request Using staffSession.accessToken
{
  "branch_slug": "${branch.slug}",
  "items": [{"item_name": "QA-AUTOTEST Cups", "supplier": "Amazon", "qty": 1}]
}
Then AssertStatus request 201

When Patch /api/v1/order-requests/${request.body.data.id}/cancel Into cancelled Using staffSession.accessToken
Then AssertStatus cancelled 200
And Assert cancelled.body.data.status == "cancelled"

When Patch /api/v1/order-requests/${request.body.data.id}/cancel Into secondCancel Using staffSession.accessToken
Then AssertStatus secondCancel 400
```
