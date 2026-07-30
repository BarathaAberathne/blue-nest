---
id: PROC-TC-008
number: 2.6.8
type: Test Case
title: Generating a purchase order from a supply request produces a draft cart that can be edited, but not until fulfillment details or receipt (not yet placed)
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

# Generate a draft purchase cart

New coverage (`SUI-PROCUREMENT-001`). Verified against
`internal/service/purchase_cart.go`. Reads the shared `adminSession`/
`staffSession`/`branch` suite fixtures — see `SUI-PROCUREMENT-001`.

```bnrest
Given Post /api/v1/order-requests Into request Using staffSession.accessToken
{
  "branch_slug": "${branch.slug}",
  "items": [{"item_name": "QA-AUTOTEST Sourcing Item", "supplier": "Gompels", "qty": 4}]
}
Then AssertStatus request 201

When Post /api/v1/admin/purchase-carts/generate Into generated Using adminSession.accessToken
{
  "request_ids": ["${request.body.data.id}"]
}
Then AssertStatus generated 201
CopyJson generated "$.body.data[0]" Into cart
Then Assert cart.status == "draft"
And Assert cart.ref != null

When Get /api/v1/admin/purchase-carts/${cart.id} Into fetched Using adminSession.accessToken
Then AssertStatus fetched 200

When Patch /api/v1/admin/purchase-carts/${cart.id}/fulfillment Into fulfillmentBeforePlaced Using adminSession.accessToken
{
  "tracking_number": "QA-AUTOTEST-TRACK-001"
}
Then AssertStatus fulfillmentBeforePlaced 400

When Post /api/v1/admin/purchase-carts/${cart.id}/receive Into receiveBeforePlaced Using adminSession.accessToken
{
  "items": []
}
Then AssertStatus receiveBeforePlaced 400
```

No teardown: order requests and purchase carts have no delete endpoint by
design (an audit trail of real orders) — left as `QA-AUTOTEST`-prefixed
data, matching this repo's established fixture convention.
