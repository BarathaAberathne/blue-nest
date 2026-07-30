---
id: BRANCH-TC-004
number: 1.2.7
type: Test Case
title: Create an active branch
owner: QA
mode: Standalone
status: Active
tags:
  - branch
  - golden-path
  - functional
dependsOn: []
uses:
  - AUTH-UTIL-001
  - BRANCH-FIX-001
  - BRANCH-FIX-002
fixtureScope: case
timeoutSeconds: 30
---

# Create an active branch (generic, branch-independent)

New generic functional test case (see the "Critical Architecture
Correction" in `test-platform-architecture.md`) — proves branch creation
as its own behaviour, independent of any named branch, using the dynamic
`BRANCH-FIX-001`/`BRANCH-FIX-002` fixtures. `BRANCH-TC-001..003b` (the
migrated `BranchSuite` parity slice) keep their existing ids/numbers
unchanged — this is additive, numbered `004` to avoid renumbering already
-verified work.

```bnrest
Setup
Call ../../utils/auth/AUTH-UTIL-001-login.bnrest.md With Json Into session
{
  "email": "admin@bluenest.uk",
  "password": "${secret:QA_ADMIN_PASSWORD}"
}

Body
Call ../../utils/branch/BRANCH-FIX-001-create-test-branch.bnrest.md With Json Into branch
{
  "accessToken": "${session.accessToken}"
}

Assert branch.id != null
Assert branch.slug != null

When Get /api/v1/admin/branches Into allBranches Using session.accessToken
Then AssertJson allBranches "$.body.data[?(@.slug=='${branch.slug}')]" == 1

Teardown
Call ../../utils/branch/BRANCH-FIX-002-archive-test-branch.bnrest.md With Json Into cleanup
{
  "accessToken": "${session.accessToken}",
  "slug": "${branch.slug}"
}
```
