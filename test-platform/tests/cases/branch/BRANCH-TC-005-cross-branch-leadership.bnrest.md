---
id: BRANCH-TC-005
number: 1.2.8
type: Test Case
title: Leadership is org-wide — a staff member from another branch is assignable, a bogus id is rejected
owner: QA
mode: Standalone
status: Active
tags:
  - branch
  - functional
  - regression
dependsOn: []
uses:
  - AUTH-UTIL-001
  - STAFF-UTIL-001
  - BRANCH-FIX-001
  - BRANCH-FIX-002
fixtureScope: case
timeoutSeconds: 30
---

# Cross-branch leadership assignment (the "Dolvy scenario")

Regression lock for the branch Leadership fix: leadership roles (area/
regional managers) are cross-branch by nature, so (1) the org-wide
`GET /admin/branches/leadership-candidates` directory lists every branch's
currently-employed staff, (2) `PATCH /admin/branches/{slug}/managers`
accepts a staff member employed at a DIFFERENT branch, and (3) it rejects
an id with no staff record behind it (before the fix it stored any string
unvalidated). Uses two throwaway branches — no live branch is mutated.

```bnrest
Setup
Call ../../utils/auth/AUTH-UTIL-001-login.bnrest.md With Json Into session
{
  "email": "admin@bluenest.uk",
  "password": "${secret:QA_ADMIN_PASSWORD}"
}

Call ../../utils/branch/BRANCH-FIX-001-create-test-branch.bnrest.md With Json Into homeBranch
{
  "accessToken": "${session.accessToken}"
}

Call ../../utils/branch/BRANCH-FIX-001-create-test-branch.bnrest.md With Json Into ledBranch
{
  "accessToken": "${session.accessToken}"
}

Call ../../utils/staff/STAFF-UTIL-001-create-staff.bnrest.md With Json Into areaManager
{
  "accessToken": "${session.accessToken}",
  "firstName": "QA-AUTOTEST",
  "lastName": "Area Manager",
  "email": "qa-autotest-areamgr-${random()}@bluenest.test",
  "branchSlug": "${homeBranch.slug}",
  "jobTitle": "Area Manager",
  "enableLogin": false,
  "loginRole": "",
  "loginPassword": ""
}

Body
When Get /api/v1/admin/branches/leadership-candidates Into candidates Using session.accessToken
Then AssertStatus candidates 200
And AssertJson candidates "$.body.data[?(@.id=='${areaManager.id}')]" == 1

When Patch /api/v1/admin/branches/${ledBranch.slug}/managers Into assigned Using session.accessToken
{
  "regional": "${areaManager.id}"
}
Then AssertStatus assigned 200
And Assert assigned.body.data.managers.regional == areaManager.id

When Patch /api/v1/admin/branches/${ledBranch.slug}/managers Into rejected Using session.accessToken
{
  "regional": "000000000000000000000000"
}
Then AssertStatus rejected 400
And AssertJson rejected $.body.error contains "no staff record"

Teardown
Delete /api/v1/admin/staff/${areaManager.id} Using session.accessToken
Call ../../utils/branch/BRANCH-FIX-002-archive-test-branch.bnrest.md With Json Into cleanupHome
{
  "accessToken": "${session.accessToken}",
  "slug": "${homeBranch.slug}"
}
Call ../../utils/branch/BRANCH-FIX-002-archive-test-branch.bnrest.md With Json Into cleanupLed
{
  "accessToken": "${session.accessToken}",
  "slug": "${ledBranch.slug}"
}
```
