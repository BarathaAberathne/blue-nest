---
id: KEY-TC-003
number: 1.6.3
type: Test Case
title: Clearing a child's key person (empty staff_id) removes the allocation
owner: QA
mode: Standalone
status: Active
tags:
  - key-person
dependsOn: []
uses:
  - AUTH-UTIL-001
  - BRANCH-FIX-001
  - BRANCH-FIX-002
  - STAFF-UTIL-001
  - CHILD-UTIL-003
  - CHILD-UTIL-002
  - KEY-UTIL-001
fixtureScope: case
timeoutSeconds: 30
---

# Clear the key person

New generic-functional coverage. `ChildKeyPersonRequest.StaffID == ""` is
the documented clear path (`SetKeyPerson`'s own doc comment: "empty
staffID clears it").

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
  "lastName": "Key003Staff-${staffSuffix}",
  "email": "qa-autotest-key003-staff-${staffSuffix}@bluenest.test",
  "branchSlug": "${branch.slug}",
  "jobTitle": "Practitioner",
  "enableLogin": false,
  "loginRole": "",
  "loginPassword": ""
}

Call ../../utils/child/CHILD-UTIL-003-create-child-direct.bnrest.md With Json Into child
{
  "accessToken": "${session.accessToken}",
  "branchSlug": "${branch.slug}",
  "firstName": "QA-AUTOTEST",
  "lastName": "Key003Child-${staffSuffix}",
  "dob": "2023-05-01"
}

Call ../../utils/key/KEY-UTIL-001-set-key-person.bnrest.md With Json Into initialAssign
{
  "accessToken": "${session.accessToken}",
  "childId": "${child.id}",
  "staffId": "${staff.id}"
}
Assert initialAssign.keyPersonId == staff.id

Body
When Call ../../utils/key/KEY-UTIL-001-set-key-person.bnrest.md With Json Into cleared
{
  "accessToken": "${session.accessToken}",
  "childId": "${child.id}",
  "staffId": ""
}
Then Assert cleared.keyPersonId == "null"

When Call ../../utils/child/CHILD-UTIL-002-get-child.bnrest.md With Json Into fetched
{
  "accessToken": "${session.accessToken}",
  "childId": "${child.id}"
}
Then Assert fetched.keyPersonId == "null"

Teardown
Delete /api/v1/admin/children/${child.id} Using session.accessToken
Delete /api/v1/admin/staff/${staff.id} Using session.accessToken
Call ../../utils/branch/BRANCH-FIX-002-archive-test-branch.bnrest.md With Json Into cleanup
{
  "accessToken": "${session.accessToken}",
  "slug": "${branch.slug}"
}
```
