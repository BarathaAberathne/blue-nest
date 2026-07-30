---
id: BRANCH-TC-001b
number: 1.2.2
type: Test Case
title: Branch KPIs are non-negative and internally consistent
owner: QA
mode: Standalone
status: Active
tags:
  - branch
dependsOn: []
uses:
  - AUTH-UTIL-001
fixtureScope: case
timeoutSeconds: 30
---

# Branch KPIs are non-negative and internally consistent (occupancy <= 100%)

Replaces legacy `BranchSuite.tc_br_001b_branchKpisAreSane`.

```bnrest
Given Call ../../utils/auth/AUTH-UTIL-001-login.bnrest.md With Json Into session
{
  "email": "admin@bluenest.uk",
  "password": "${secret:QA_ADMIN_PASSWORD}"
}

When Get /api/v1/admin/children/stats Into stats Using session.accessToken
Then AssertStatus stats 200
And Assert stats.body.data.total >= 0
And Assert stats.body.data.occupancy_rate >= 0 && stats.body.data.occupancy_rate <= 100
```
