---
id: BRANCH-UTIL-001
number: U.2
type: Test Util
title: Get a branch by slug
owner: QA Platform
mode: Standalone
status: Active
tags:
  - branch
fixtureScope: case
timeoutSeconds: 30
---

# Get a branch by slug

Finds one branch in the full `/admin/branches` list by slug — the shared
"get Harrow" helper every Branch test needs (mirrors legacy
`BranchSuite.harrowRequestBody()`). Deliberately `fixtureScope: case` (not
`suite`) — several callers PUT to this same branch, so a stale suite-cached
read would be actively wrong for a later test expecting to see the
previous test's write.

Inputs: `input.slug`, `input.accessToken` (utility inputs are explicit —
this util has no access to the caller's `session` variable, only what's
passed via `With Json`).

```bnrest
Get /api/v1/admin/branches Into allBranches Using input.accessToken
AssertStatus allBranches 200

CopyJson allBranches $.body.data[?(@.slug=='${input.slug}')] Into branch
Assert branch.slug == input.slug

Output branch
```
