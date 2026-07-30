---
id: PROC-TC-004
number: 2.6.4
type: Test Case
title: Admin can set a request's status to any valid enum value from any other, with no state-machine enforcement (gap lock), but an invalid value is rejected
owner: QA
mode: Standalone
status: Active
tags:
  - procurement
  - regression
dependsOn: []
uses: []
fixtureScope: case
timeoutSeconds: 30
---

# Admin status update has no state machine

New coverage (`SUI-PROCUREMENT-001`). Verified against
`internal/service/order_request.go`'s `UpdateStatus` — only
`IsValidOrderRequestStatus` is checked, no transition table. Reads the
shared `adminSession`/`staffSession`/`branch` suite fixtures — see
`SUI-PROCUREMENT-001`.

```bnrest
Given Post /api/v1/order-requests Into request Using staffSession.accessToken
{
  "branch_slug": "${branch.slug}",
  "items": [{"item_name": "QA-AUTOTEST Bibs", "supplier": "Amazon", "qty": 2}]
}
Then AssertStatus request 201

When Patch /api/v1/admin/order-requests/${request.body.data.id}/status Into toReceived Using adminSession.accessToken
{
  "status": "received"
}
Then AssertStatus toReceived 200
And Assert toReceived.body.data.status == "received"

When Patch /api/v1/admin/order-requests/${request.body.data.id}/status Into backToPending Using adminSession.accessToken
{
  "status": "pending"
}
Then AssertStatus backToPending 200
And Assert backToPending.body.data.status == "pending"

When Patch /api/v1/admin/order-requests/${request.body.data.id}/status Into invalid Using adminSession.accessToken
{
  "status": "qa-autotest-not-a-real-status"
}
Then AssertStatus invalid 400
```
