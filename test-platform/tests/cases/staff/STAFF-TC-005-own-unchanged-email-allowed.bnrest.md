---
id: STAFF-TC-005
number: 1.4.5
type: Test Case
title: Updating a staff member's OWN email to its own current value is allowed
owner: QA
mode: Standalone
status: Active
tags:
  - staff
dependsOn: []
uses:
  - AUTH-UTIL-001
  - STAFF-UTIL-001
  - BRANCH-FIX-001
  - BRANCH-FIX-002
fixtureScope: case
timeoutSeconds: 30
---

# Updating own email to its own current value is not a false-positive duplicate

Replaces legacy `StaffSuite.tc_staff_003c_updatingOwnUnchangedEmailIsAllowed`.
Uses its own throwaway branch (generic-architecture retrofit).

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
  "lastName": "TC-STAFF-003c fixture",
  "email": "qa-autotest-staff003c-${emailSuffix}@bluenest.test",
  "branchSlug": "${branch.slug}",
  "jobTitle": "Practitioner",
  "enableLogin": false,
  "loginRole": "",
  "loginPassword": ""
}

Body
When Put /api/v1/admin/staff/${fixture.id} Into updated Using session.accessToken
{
  "first_name": "QA",
  "last_name": "AutoTest Staff Renamed",
  "email": "qa-autotest-staff003c-${emailSuffix}@bluenest.test",
  "branch_slug": "${branch.slug}"
}
Then AssertStatus updated 200

Teardown
Delete /api/v1/admin/staff/${fixture.id} Using session.accessToken
Call ../../utils/branch/BRANCH-FIX-002-archive-test-branch.bnrest.md With Json Into cleanup
{
  "accessToken": "${session.accessToken}",
  "slug": "${branch.slug}"
}
```
