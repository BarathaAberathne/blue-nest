---
id: KEY-TC-004
number: 1.6.4
type: Test Case
title: The same staff member can be key person for two different children (no exclusivity enforced)
owner: QA
mode: Standalone
status: Active
tags:
  - key-person
  - regression
dependsOn: []
uses:
  - AUTH-UTIL-001
  - BRANCH-FIX-001
  - BRANCH-FIX-002
  - STAFF-UTIL-001
  - CHILD-UTIL-003
  - KEY-UTIL-001
  - KEY-UTIL-002
fixtureScope: case
timeoutSeconds: 30
---

# Duplicate key-person allocation is currently allowed (gap lock)

A **gap lock**, not a bug fix target: `childService.SetKeyPerson` has no
"is this staff member already at capacity" or exclusivity check —
`docs/testing/test-platform-architecture.md` documents this class of test
(see `ROOMSTAFF-TC-002`'s "no max staff per room enforced" for the
established convention). This proves the real, current behaviour so a
future product decision to cap key-person caseloads has a regression test
ready to flip, rather than silently discovering the gap.

```bnrest
Setup
Call ../../utils/auth/AUTH-UTIL-001-login.bnrest.md With Json Into session
{
  "email": "admin@bluenest.uk",
  "password": "${secret:QA_ADMIN_PASSWORD}"
}

Call ../../utils/branch/BRANCH-FIX-001-create-test-branch.bnrest.md With Json Into branch
{
  "accessToken": "${session.accessToken}"
}

Set staffSuffix = random()
Call ../../utils/staff/STAFF-UTIL-001-create-staff.bnrest.md With Json Into staff
{
  "accessToken": "${session.accessToken}",
  "firstName": "QA-AUTOTEST",
  "lastName": "Key004Staff-${staffSuffix}",
  "email": "qa-autotest-key004-staff-${staffSuffix}@bluenest.test",
  "branchSlug": "${branch.slug}",
  "jobTitle": "Practitioner",
  "enableLogin": false,
  "loginRole": "",
  "loginPassword": ""
}

Call ../../utils/child/CHILD-UTIL-003-create-child-direct.bnrest.md With Json Into childA
{
  "accessToken": "${session.accessToken}",
  "branchSlug": "${branch.slug}",
  "firstName": "QA-AUTOTEST",
  "lastName": "Key004ChildA-${staffSuffix}",
  "dob": "${today("-3y")}"
}

Call ../../utils/child/CHILD-UTIL-003-create-child-direct.bnrest.md With Json Into childB
{
  "accessToken": "${session.accessToken}",
  "branchSlug": "${branch.slug}",
  "firstName": "QA-AUTOTEST",
  "lastName": "Key004ChildB-${staffSuffix}",
  "dob": "${today("-3y")}"
}

Body
When Call ../../utils/key/KEY-UTIL-001-set-key-person.bnrest.md With Json Into assignA
{
  "accessToken": "${session.accessToken}",
  "childId": "${childA.id}",
  "staffId": "${staff.id}"
}
Then Assert assignA.keyPersonId == staff.id

When Call ../../utils/key/KEY-UTIL-001-set-key-person.bnrest.md With Json Into assignB
{
  "accessToken": "${session.accessToken}",
  "childId": "${childB.id}",
  "staffId": "${staff.id}"
}
Then Assert assignB.keyPersonId == staff.id

When Call ../../utils/key/KEY-UTIL-002-get-staff-key-children.bnrest.md With Json Into keyChildren
{
  "accessToken": "${session.accessToken}",
  "staffId": "${staff.id}"
}
Then AssertJson keyChildren "$.body.data[?(@.id=='${childA.id}')]" == 1
And AssertJson keyChildren "$.body.data[?(@.id=='${childB.id}')]" == 1

Teardown
Delete /api/v1/admin/children/${childA.id} Using session.accessToken
Delete /api/v1/admin/children/${childB.id} Using session.accessToken
Delete /api/v1/admin/staff/${staff.id} Using session.accessToken
Call ../../utils/branch/BRANCH-FIX-002-archive-test-branch.bnrest.md With Json Into cleanup
{
  "accessToken": "${session.accessToken}",
  "slug": "${branch.slug}"
}
```
