---
id: STAFF-TC-006
number: 1.4.6
type: Test Case
title: A room-only/minimal update does NOT wipe email, phone, or job title
owner: QA
mode: Standalone
status: Active
tags:
  - staff
  - regression
dependsOn: []
uses:
  - AUTH-UTIL-001
  - BRANCH-FIX-001
  - BRANCH-FIX-002
fixtureScope: case
timeoutSeconds: 30
---

# Partial update preserves contact fields (data-loss regression)

Replaces legacy `StaffSuite.tc_staff_004_reg_partialUpdatePreservesContactFields`
— a Critical/data-loss regression lock: `applyStaff` used to unconditionally
overwrite `email`/`phone`/`job_title` on every `PUT`, so a minimal payload
(only `first_name`/`last_name`/`branch_slug`) silently wiped them. `Teardown`
cleans up **even if the Body assertion fails** (finally-semantics), exactly
matching the legacy test's own `try`/`finally`. Uses its own throwaway
branch (generic-architecture retrofit).

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

Post /api/v1/admin/staff Into fixture Using session.accessToken
{
  "first_name": "QA-AUTOTEST",
  "last_name": "WipeCheck",
  "email": "qa-autotest-staff004wipecheck-${emailSuffix}@bluenest.test",
  "phone": "07123456789",
  "job_title": "Practitioner",
  "branch_slug": "${branch.slug}"
}
AssertStatus fixture 201
CopyJson fixture $.body.data.email Into originalEmail

Body
When Put /api/v1/admin/staff/${fixture.body.data.id} Into updated Using session.accessToken
{
  "first_name": "QA-AUTOTEST",
  "last_name": "WipeCheck",
  "branch_slug": "${branch.slug}"
}
Then AssertStatus updated 200
And Assert updated.body.data.email == originalEmail
And Assert updated.body.data.phone == "07123456789"
And Assert updated.body.data.job_title == "Practitioner"

Teardown
Delete /api/v1/admin/staff/${fixture.body.data.id} Using session.accessToken
Call ../../utils/branch/BRANCH-FIX-002-archive-test-branch.bnrest.md With Json Into cleanup
{
  "accessToken": "${session.accessToken}",
  "slug": "${branch.slug}"
}
```
