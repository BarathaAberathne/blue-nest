---
id: FEE-TC-002
number: 2.25.2
type: Test Case
title: An admin fee-rate update persists, requires a real branch, and vanishes when the branch is archived
owner: QA
mode: Standalone
status: Active
tags:
  - fees
  - regression
dependsOn: []
uses: []
fixtureScope: case
timeoutSeconds: 40
---

# Admin fee update round-trip (branch-bound)

The org's branch list is the source of truth for the fees editor and the
public calculator: rates can only be saved against a real branch, the bundle
serves only non-archived branches, and archiving a branch removes its rates
from the bundle (no orphan "phantom branch" tabs — found live as a leftover
`qatestfees` tab on /admin/fees). Reads the shared `adminSession` fixture
(see `SUI-FEES-001`).

```bnrest
Setup
Set feeSuffix = random()
Post /api/v1/admin/branches Into feeBranch Using adminSession.accessToken
{ "slug": "qa-autotest-fees-${feeSuffix}", "name": "QA-AUTOTEST Fees Branch ${feeSuffix}", "contact": { "email": "qa@bluenest.test", "address": "1 Test Way" }, "admissions": { "age_range": "0-5" } }
AssertStatus feeBranch 201

Body
# Saving rates against a branch that doesn't exist is rejected.
When Put /api/v1/admin/fee-config/qa-autotest-nosuch-${feeSuffix} Into phantom Using adminSession.accessToken
{ "ageGroups": { "2-3": { "full_day": { "daily": 50, "weekly": 240 } } }, "earlyBird": 13, "stdFunded": { "below3": { "full_day": 15 } } }
Then AssertStatus phantom 400

# Against the real branch the upsert persists and is served by the bundle.
When Put /api/v1/admin/fee-config/qa-autotest-fees-${feeSuffix} Into created Using adminSession.accessToken
{ "ageGroups": { "2-3": { "full_day": { "daily": 50, "weekly": 240 } } }, "earlyBird": 13, "stdFunded": { "below3": { "full_day": 15 } } }
Then AssertStatus created 200
And Assert created.body.data.earlyBird == 13

When Get /api/v1/fee-config Into after Using adminSession.accessToken
Then AssertStatus after 200
And AssertJson after "$.body.data.branches['qa-autotest-fees-${feeSuffix}'].earlyBird" == 13

# Archiving the branch removes its rates from the bundle — no orphan tabs.
When Post /api/v1/admin/branches/qa-autotest-fees-${feeSuffix}/archive Into archived Using adminSession.accessToken
Then AssertStatus archived 204

When Get /api/v1/fee-config Into gone Using adminSession.accessToken
Then AssertStatus gone 200
And ExpectFail AssertJson gone "$.body.data.branches['qa-autotest-fees-${feeSuffix}'].earlyBird" == 13

Teardown
Post /api/v1/admin/branches/qa-autotest-fees-${feeSuffix}/archive Using adminSession.accessToken
```
