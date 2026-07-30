---
id: KEY-TC-005
number: 1.6.5
type: Test Case
title: A staff member from a different branch cannot be assigned as key person
owner: QA
mode: Standalone
status: Active
tags:
  - key-person
  - golden-path
dependsOn: []
uses:
  - AUTH-UTIL-001
  - BRANCH-FIX-001
  - BRANCH-FIX-002
  - STAFF-UTIL-001
  - CHILD-UTIL-003
fixtureScope: case
timeoutSeconds: 30
---

# Cross-branch key-person assignment is rejected

New generic-functional coverage of a real, positively-enforced invariant —
`childService.SetKeyPerson`: "if `st.BranchSlug != child.BranchSlug`,
reject" (`the key person must be a staff member at the child's branch`).
Uses two independent throwaway branches to genuinely prove cross-branch
rejection, the same pattern established in `ROOM-TC-006`.

```bnrest
Setup
Call ../../utils/auth/AUTH-UTIL-001-login.bnrest.md With Json Into session
{
  "email": "admin@bluenest.uk",
  "password": "${secret:QA_ADMIN_PASSWORD}"
}

Call ../../utils/branch/BRANCH-FIX-001-create-test-branch.bnrest.md With Json Into branchA
{
  "accessToken": "${session.accessToken}"
}

Call ../../utils/branch/BRANCH-FIX-001-create-test-branch.bnrest.md With Json Into branchB
{
  "accessToken": "${session.accessToken}"
}

Set suffix = random()
Call ../../utils/staff/STAFF-UTIL-001-create-staff.bnrest.md With Json Into staffB
{
  "accessToken": "${session.accessToken}",
  "firstName": "QA-AUTOTEST",
  "lastName": "Key005StaffB-${suffix}",
  "email": "qa-autotest-key005-staffb-${suffix}@bluenest.test",
  "branchSlug": "${branchB.slug}",
  "jobTitle": "Practitioner",
  "enableLogin": false,
  "loginRole": "",
  "loginPassword": ""
}

Call ../../utils/child/CHILD-UTIL-003-create-child-direct.bnrest.md With Json Into childA
{
  "accessToken": "${session.accessToken}",
  "branchSlug": "${branchA.slug}",
  "firstName": "QA-AUTOTEST",
  "lastName": "Key005ChildA-${suffix}",
  "dob": "2023-05-01"
}

Body
When Patch /api/v1/admin/children/${childA.id}/key-person Into rejected Using session.accessToken
{
  "staff_id": "${staffB.id}"
}
Then AssertStatus rejected 400
And AssertJson rejected $.body.error contains "key person must be a staff member at the child's branch"

Teardown
Delete /api/v1/admin/children/${childA.id} Using session.accessToken
Delete /api/v1/admin/staff/${staffB.id} Using session.accessToken
Call ../../utils/branch/BRANCH-FIX-002-archive-test-branch.bnrest.md With Json Into cleanupA
{
  "accessToken": "${session.accessToken}",
  "slug": "${branchA.slug}"
}
Call ../../utils/branch/BRANCH-FIX-002-archive-test-branch.bnrest.md With Json Into cleanupB
{
  "accessToken": "${session.accessToken}",
  "slug": "${branchB.slug}"
}
```
