---
id: BRANCH-TC-001
number: 1.2.1
type: Test Case
title: Harrow branch exists exactly once, active, with a unique slug
owner: QA
mode: Standalone
status: Active
tags:
  - branch
  - golden-path
dependsOn: []
uses:
  - AUTH-UTIL-001
  - BRANCH-UTIL-001
fixtureScope: case
timeoutSeconds: 30
---

# Harrow branch exists exactly once, active

Replaces legacy `BranchSuite.tc_br_001_harrowExistsCorrectly` (adapted —
this environment already has a live Harrow branch with real data, not a
from-scratch tenant; see the legacy suite's own README).

```bnrest
Given Call ../../utils/auth/AUTH-UTIL-001-login.bnrest.md With Json Into session
{
  "email": "admin@bluenest.uk",
  "password": "${secret:QA_ADMIN_PASSWORD}"
}

When Get /api/v1/admin/branches Into allBranches Using session.accessToken
Then AssertStatus allBranches 200
And AssertJson allBranches $.body.data[?(@.slug=='harrow')] == 1

When Call ../../utils/branch/BRANCH-UTIL-001-get-branch.bnrest.md With Json Into harrow
{
  "slug": "harrow",
  "accessToken": "${session.accessToken}"
}
Then Assert harrow.status == "active"
```
