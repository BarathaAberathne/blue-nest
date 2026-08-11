---
id: SUI-LEAVE-001
number: "2.23"
type: Test Suite
title: Staff leave / holiday requests — apply, review, four-eyes, cancel
owner: QA
mode: Dependent
status: Active
tags:
  - leave
dependsOn: []
uses: []
fixtureScope: suite
timeoutSeconds: 120
---

# Staff leave requests

Covers the staff leave/holiday workflow (`/leave-requests` +
`/admin/leave-requests`). Creates its own branch + staff, then runs the
single-user-testable paths: apply, appears in the review queue, four-eyes
blocks self-approval, applicant cancels, and a reversed date range is
rejected. (The approval-success path needs a second reviewer and is covered
by the service/unit layer.)

```bnrest
Setup
Call ../../utils/auth/AUTH-UTIL-001-login.bnrest.md With Json Into adminSession
{
  "email": "admin@bluenest.uk",
  "password": "${secret:QA_ADMIN_PASSWORD}"
}

Call ../../utils/branch/BRANCH-FIX-001-create-test-branch.bnrest.md With Json Into branch
{ "accessToken": "${adminSession.accessToken}" }

Call ../../utils/staff/STAFF-UTIL-001-create-staff.bnrest.md With Json Into staff
{
  "accessToken": "${adminSession.accessToken}",
  "firstName": "QA-AUTOTEST",
  "lastName": "Leave-${random()}",
  "email": "qa-autotest-leave-${random()}@bluenest.test",
  "branchSlug": "${branch.slug}",
  "jobTitle": "",
  "enableLogin": false,
  "loginRole": "",
  "loginPassword": ""
}

Call ../../utils/staff/STAFF-UTIL-001-create-staff.bnrest.md With Json Into mgr
{
  "accessToken": "${adminSession.accessToken}",
  "firstName": "QA-AUTOTEST",
  "lastName": "LeaveMgr-${random()}",
  "email": "qa-autotest-leavemgr-${random()}@bluenest.test",
  "branchSlug": "${branch.slug}",
  "jobTitle": "",
  "enableLogin": true,
  "loginRole": "branch_manager",
  "loginPassword": "QA-mgr-pass-123"
}

Call ../../utils/auth/AUTH-UTIL-001-login.bnrest.md With Json Into mgrSession
{ "email": "${mgr.email}", "password": "QA-mgr-pass-123" }

Body
Call CatchError ../../cases/leave/LEAVE-TC-001-apply-review-cancel.bnrest.md
Call CatchError ../../cases/leave/LEAVE-TC-002-balance-and-manager-file.bnrest.md
Call CatchError ../../cases/leave/LEAVE-TC-003-approved-blocks-rota.bnrest.md
Call CatchError ../../cases/leave/LEAVE-TC-004-notification-links-resolve.bnrest.md
```
