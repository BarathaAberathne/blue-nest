---
id: STAFF-TC-004
number: 1.4.4
type: Test Case
title: Duplicate email on UPDATE (renaming someone else onto an existing email) is rejected
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

# Duplicate email on update is rejected

Replaces legacy `StaffSuite.tc_staff_003b_duplicateEmailOnUpdateRejected`.
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

Call ../../utils/staff/STAFF-UTIL-001-create-staff.bnrest.md With Json Into first
{
  "accessToken": "${session.accessToken}",
  "firstName": "QA",
  "lastName": "TC-STAFF-003b First",
  "email": "qa-autotest-staff003b-first-${emailSuffix}@bluenest.test",
  "branchSlug": "${branch.slug}",
  "jobTitle": "Practitioner",
  "enableLogin": false,
  "loginRole": "",
  "loginPassword": ""
}

Call ../../utils/staff/STAFF-UTIL-001-create-staff.bnrest.md With Json Into second
{
  "accessToken": "${session.accessToken}",
  "firstName": "QA",
  "lastName": "Second Staff",
  "email": "qa-autotest-staff003b-second-${emailSuffix}@bluenest.test",
  "branchSlug": "${branch.slug}",
  "jobTitle": "Practitioner",
  "enableLogin": false,
  "loginRole": "",
  "loginPassword": ""
}

Body
When Put /api/v1/admin/staff/${second.id} Into rejected Using session.accessToken
{
  "first_name": "QA",
  "last_name": "Second Staff",
  "email": "qa-autotest-staff003b-first-${emailSuffix}@bluenest.test",
  "branch_slug": "${branch.slug}"
}
Then AssertStatus rejected 400
And AssertJson rejected $.body.error contains "already exists"

Teardown
Delete /api/v1/admin/staff/${first.id} Using session.accessToken
Delete /api/v1/admin/staff/${second.id} Using session.accessToken
Call ../../utils/branch/BRANCH-FIX-002-archive-test-branch.bnrest.md With Json Into cleanup
{
  "accessToken": "${session.accessToken}",
  "slug": "${branch.slug}"
}
```
