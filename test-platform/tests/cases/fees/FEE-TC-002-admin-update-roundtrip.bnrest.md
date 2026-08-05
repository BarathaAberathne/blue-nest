---
id: FEE-TC-002
number: 2.25.2
type: Test Case
title: An admin fee-rate update persists and shows on the public bundle
owner: QA
mode: Standalone
status: Active
tags:
  - fees
  - regression
dependsOn: []
uses: []
fixtureScope: case
timeoutSeconds: 30
---

# Admin fee update round-trip

Upserting a branch's rates via the admin editor persists and is served by the
public bundle. Uses a throwaway (hyphen-free) branch slug so no real branch is
touched. Reads the shared `adminSession` fixture (see `SUI-FEES-001`).

```bnrest
When Put /api/v1/admin/fee-config/qatestfees Into created Using adminSession.accessToken
{ "ageGroups": { "2-3": { "full_day": { "daily": 50, "weekly": 240 } } }, "earlyBird": 13, "stdFunded": { "below3": { "full_day": 15 } } }
Then AssertStatus created 200
And Assert created.body.data.earlyBird == 13

When Get /api/v1/fee-config Into after Using adminSession.accessToken
Then AssertStatus after 200
And Assert after.body.data.branches.qatestfees.earlyBird == 13
```
