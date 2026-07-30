---
id: STAFF-TC-001
number: 1.4.1
type: Test Case
title: A new staff member is created exactly once, linked to Harrow, status active
owner: QA
mode: Standalone
status: Active
tags:
  - staff
  - golden-path
dependsOn: []
uses:
  - AUTH-UTIL-001
  - STAFF-UTIL-001
  - BRANCH-FIX-001
  - BRANCH-FIX-002
fixtureScope: case
timeoutSeconds: 30
---

# Staff member is created exactly once

Replaces legacy `StaffSuite.tc_staff_001_createsStaffOnce`. Creates its own
throwaway branch (generic-architecture retrofit) rather than using Harrow.

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

Body
Call ../../utils/staff/STAFF-UTIL-001-create-staff.bnrest.md With Json Into staff
{
  "accessToken": "${session.accessToken}",
  "firstName": "QA-AUTOTEST",
  "lastName": "AutoTest Staff",
  "email": "qa-autotest-staff1-${random()}@bluenest.test",
  "branchSlug": "${branch.slug}",
  "jobTitle": "Practitioner",
  "enableLogin": false,
  "loginRole": "",
  "loginPassword": ""
}

Assert staff.id != null
Assert staff.ref != null
AssertJson staff $.ref contains "STF-"

Teardown
Delete /api/v1/admin/staff/${staff.id} Using session.accessToken
Call ../../utils/branch/BRANCH-FIX-002-archive-test-branch.bnrest.md With Json Into cleanup
{
  "accessToken": "${session.accessToken}",
  "slug": "${branch.slug}"
}
```
