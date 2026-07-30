---
id: STAFF-TC-002
number: 1.4.2
type: Test Case
title: An invalid staff status value is rejected
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

# Invalid status is rejected

Replaces legacy `StaffSuite.tc_staff_001b_invalidStatusRejected`. Calls the
raw endpoint directly (`STAFF-UTIL-001` hardcodes `status: active`). Uses
its own throwaway branch (generic-architecture retrofit).

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
When Post /api/v1/admin/staff Into rejected Using session.accessToken
{
  "first_name": "QA",
  "last_name": "Invalid Status",
  "branch_slug": "${branch.slug}",
  "status": "definitely_not_a_real_status"
}
Then AssertStatus rejected 400
And AssertJson rejected $.body.error contains "status"

Teardown
Call ../../utils/branch/BRANCH-FIX-002-archive-test-branch.bnrest.md With Json Into cleanup
{
  "accessToken": "${session.accessToken}",
  "slug": "${branch.slug}"
}
```
