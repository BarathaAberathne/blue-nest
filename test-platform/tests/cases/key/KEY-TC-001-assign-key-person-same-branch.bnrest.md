---
id: KEY-TC-001
number: 1.6.1
type: Test Case
title: Assigning an active staff member at the child's own branch as key person succeeds
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
  - CHILD-UTIL-002
  - CHILD-UTIL-003
  - KEY-UTIL-001
  - KEY-UTIL-002
fixtureScope: case
timeoutSeconds: 30
---

# Assign a key person (golden path)

New generic-functional coverage — the legacy suite never tested key-person
allocation at all (`grep` across `test-automation/rest-assured-suite` found
no `key_person`/`KeyPerson` reference anywhere). Proves the real, positive
behaviour: `PATCH /admin/children/{id}/key-person` succeeds for a staff
member at the child's own branch, is reflected on a fresh `GET` of the
child, and shows up on the reverse lookup (`GET
/admin/staff/{id}/key-children`).

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
  "lastName": "KeyPerson-${staffSuffix}",
  "email": "qa-autotest-key001-staff-${staffSuffix}@bluenest.test",
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
  "lastName": "Key001Child-${staffSuffix}",
  "dob": "${today("-3y")}"
}

Body
When Call ../../utils/key/KEY-UTIL-001-set-key-person.bnrest.md With Json Into assigned
{
  "accessToken": "${session.accessToken}",
  "childId": "${child.id}",
  "staffId": "${staff.id}"
}
Then Assert assigned.keyPersonId == staff.id

When Call ../../utils/child/CHILD-UTIL-002-get-child.bnrest.md With Json Into fetched
{
  "accessToken": "${session.accessToken}",
  "childId": "${child.id}"
}
Then Assert fetched.keyPersonId == staff.id

When Call ../../utils/key/KEY-UTIL-002-get-staff-key-children.bnrest.md With Json Into keyChildren
{
  "accessToken": "${session.accessToken}",
  "staffId": "${staff.id}"
}
Then AssertJson keyChildren "$.body.data[?(@.id=='${child.id}')]" == 1

Teardown
Delete /api/v1/admin/children/${child.id} Using session.accessToken
Delete /api/v1/admin/staff/${staff.id} Using session.accessToken
Call ../../utils/branch/BRANCH-FIX-002-archive-test-branch.bnrest.md With Json Into cleanup
{
  "accessToken": "${session.accessToken}",
  "slug": "${branch.slug}"
}
```
