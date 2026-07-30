---
id: KEY-TC-002
number: 1.6.2
type: Test Case
title: Reassigning a child's key person to a different staff member overwrites the previous one
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
  - KEY-UTIL-001
  - KEY-UTIL-002
fixtureScope: case
timeoutSeconds: 30
---

# Reassign the key person

New generic-functional coverage. `SetKeyPerson` unconditionally overwrites
`key_person_id` — no "already has a key person" guard — so reassignment is
a plain, real, successful operation. Proves the old staff member's reverse
lookup drops the child and the new one's picks it up.

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
Call ../../utils/staff/STAFF-UTIL-001-create-staff.bnrest.md With Json Into staffA
{
  "accessToken": "${session.accessToken}",
  "firstName": "QA-AUTOTEST",
  "lastName": "Key002StaffA-${staffSuffix}",
  "email": "qa-autotest-key002-staffa-${staffSuffix}@bluenest.test",
  "branchSlug": "${branch.slug}",
  "jobTitle": "Practitioner",
  "enableLogin": false,
  "loginRole": "",
  "loginPassword": ""
}

Call ../../utils/staff/STAFF-UTIL-001-create-staff.bnrest.md With Json Into staffB
{
  "accessToken": "${session.accessToken}",
  "firstName": "QA-AUTOTEST",
  "lastName": "Key002StaffB-${staffSuffix}",
  "email": "qa-autotest-key002-staffb-${staffSuffix}@bluenest.test",
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
  "lastName": "Key002Child-${staffSuffix}",
  "dob": "2023-05-01"
}

Call ../../utils/key/KEY-UTIL-001-set-key-person.bnrest.md With Json Into initialAssign
{
  "accessToken": "${session.accessToken}",
  "childId": "${child.id}",
  "staffId": "${staffA.id}"
}
Assert initialAssign.keyPersonId == staffA.id

Body
When Call ../../utils/key/KEY-UTIL-001-set-key-person.bnrest.md With Json Into reassigned
{
  "accessToken": "${session.accessToken}",
  "childId": "${child.id}",
  "staffId": "${staffB.id}"
}
Then Assert reassigned.keyPersonId == staffB.id

When Call ../../utils/key/KEY-UTIL-002-get-staff-key-children.bnrest.md With Json Into staffAChildren
{
  "accessToken": "${session.accessToken}",
  "staffId": "${staffA.id}"
}
Then AssertJson staffAChildren "$.body.data[?(@.id=='${child.id}')]" == 0

When Call ../../utils/key/KEY-UTIL-002-get-staff-key-children.bnrest.md With Json Into staffBChildren
{
  "accessToken": "${session.accessToken}",
  "staffId": "${staffB.id}"
}
Then AssertJson staffBChildren "$.body.data[?(@.id=='${child.id}')]" == 1

Teardown
Delete /api/v1/admin/children/${child.id} Using session.accessToken
Delete /api/v1/admin/staff/${staffA.id} Using session.accessToken
Delete /api/v1/admin/staff/${staffB.id} Using session.accessToken
Call ../../utils/branch/BRANCH-FIX-002-archive-test-branch.bnrest.md With Json Into cleanup
{
  "accessToken": "${session.accessToken}",
  "slug": "${branch.slug}"
}
```
