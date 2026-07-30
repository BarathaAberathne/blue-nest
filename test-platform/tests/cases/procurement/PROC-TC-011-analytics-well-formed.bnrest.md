---
id: PROC-TC-011
number: 2.6.11
type: Test Case
title: The procurement analytics payload is well-formed
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

# Procurement analytics is well-formed

New coverage (`SUI-PROCUREMENT-001`). Verified against
`internal/service/procurement_analytics.go`. Reads the shared
`adminSession` suite fixture — see `SUI-PROCUREMENT-001`.

```bnrest
Given Get /api/v1/admin/procurement/analytics Into analytics Using adminSession.accessToken
Then AssertStatus analytics 200
And Assert analytics.body.data.total_requests >= 0
And Assert analytics.body.data.total_orders >= 0
And Assert analytics.body.data.total_spend >= 0
And Assert analytics.body.data.request_status_counts != null
And Assert analytics.body.data.order_status_counts != null
```
