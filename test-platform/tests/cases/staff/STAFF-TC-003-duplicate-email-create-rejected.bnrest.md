---
id: STAFF-TC-003
number: 1.4.3
type: Test Case
title: Duplicate email on create is rejected
owner: QA
mode: Standalone
status: Active
tags:
  - staff
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

# Duplicate email on create is rejected

Replaces legacy `StaffSuite.tc_staff_003_duplicateEmailOnCreateRejected` —
a regression lock (a second Staff document with an identical email used to
be silently accepted before a backend fix). Uses its own throwaway branch
(generic-architecture retrofit).

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

Set emailSuffix = random()

Call ../../utils/staff/STAFF-UTIL-001-create-staff.bnrest.md With Json Into fixture
{
  "accessToken": "${session.accessToken}",
  "firstName": "QA",
  "lastName": "TC-STAFF-003 fixture",
  "email": "qa-autotest-staff003fixture-${emailSuffix}@bluenest.test",
  "branchSlug": "${branch.slug}",
  "jobTitle": "Practitioner",
  "enableLogin": false,
  "loginRole": "",
  "loginPassword": ""
}

Body
When Post /api/v1/admin/staff Into rejected Using session.accessToken
{
  "first_name": "QA",
  "last_name": "Duplicate Attempt",
  "email": "qa-autotest-staff003fixture-${emailSuffix}@bluenest.test",
  "branch_slug": "${branch.slug}"
}
Then AssertStatus rejected 400
And AssertJson rejected $.body.error contains "already exists"

Teardown
Delete /api/v1/admin/staff/${fixture.id} Using session.accessToken
Call ../../utils/branch/BRANCH-FIX-002-archive-test-branch.bnrest.md With Json Into cleanup
{
  "accessToken": "${session.accessToken}",
  "slug": "${branch.slug}"
}
```
