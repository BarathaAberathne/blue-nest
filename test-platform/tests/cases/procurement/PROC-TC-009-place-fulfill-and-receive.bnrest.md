---
id: PROC-TC-009
number: 2.6.9
type: Test Case
title: Marking a cart exported places it, unlocking fulfillment details and receipt, which flips the covered request to received
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

# Place, fulfill and receive a purchase order

New coverage (`SUI-PROCUREMENT-001`). Verified against
`internal/service/purchase_cart.go`'s `IsPlaced()` gating. Reads the
shared `adminSession`/`staffSession`/`branch` suite fixtures — see
`SUI-PROCUREMENT-001`.

```bnrest
Given Post /api/v1/order-requests Into request Using staffSession.accessToken
{
  "branch_slug": "${branch.slug}",
  "items": [{"item_name": "QA-AUTOTEST Receivable Item", "supplier": "Gompels", "qty": 2}]
}
Then AssertStatus request 201

When Post /api/v1/admin/purchase-carts/generate Into generated Using adminSession.accessToken
{
  "request_ids": ["${request.body.data.id}"]
}
Then AssertStatus generated 201
CopyJson generated "$.body.data[0]" Into cart
Then Assert cart.status == "draft"

When Post /api/v1/admin/purchase-carts/${cart.id}/exported Into exported Using adminSession.accessToken
{
  "results": [{"name": "QA-AUTOTEST Receivable Item", "status": "added", "qty": 2}],
  "supplier_order_ref": "QA-AUTOTEST-GOMPELS-REF-001"
}
Then AssertStatus exported 200
And Assert exported.body.data.status == "ordered"

When Patch /api/v1/admin/purchase-carts/${cart.id}/fulfillment Into fulfillment Using adminSession.accessToken
{
  "tracking_number": "QA-AUTOTEST-TRACK-002",
  "expected_delivery_date": "${today("+2m")}T00:00:00Z"
}
Then AssertStatus fulfillment 200
And Assert fulfillment.body.data.tracking_number == "QA-AUTOTEST-TRACK-002"

When Get /api/v1/order-requests/${request.body.data.id} Into requestAfterFulfillment Using staffSession.accessToken
Then AssertStatus requestAfterFulfillment 200
And Assert requestAfterFulfillment.body.data.expected_delivery_date != null

When Post /api/v1/admin/purchase-carts/${cart.id}/receive Into received Using adminSession.accessToken
{
  "items": [{"name": "QA-AUTOTEST Receivable Item", "qty_received": 2}]
}
Then AssertStatus received 200
And Assert received.body.data.status == "received"

When Get /api/v1/order-requests/${request.body.data.id} Into requestAfterReceipt Using staffSession.accessToken
Then AssertStatus requestAfterReceipt 200
And Assert requestAfterReceipt.body.data.status == "received"
```
