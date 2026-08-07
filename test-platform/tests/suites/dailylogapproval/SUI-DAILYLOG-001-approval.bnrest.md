---
id: SUI-DAILYLOG-001
number: "2.22"
type: Test Suite
title: Daily log four-eyes approval workflow
owner: QA
mode: Standalone
status: Active
tags:
  - dailylog
---

# Daily-log approval suite

New coverage for the four-eyes daily-log approval: a submitted log is
`pending` until a DIFFERENT approver signs it off (no self-approval), and
only approved logs surface as the permanent record. Setup creates a
dedicated branch + child.

```bnrest
Setup
Call ../../utils/auth/AUTH-UTIL-001-login.bnrest.md With Json Into adminSession
{ "email": "admin@bluenest.uk", "password": "${secret:QA_ADMIN_PASSWORD}" }

Call ../../utils/branch/BRANCH-FIX-001-create-test-branch.bnrest.md With Json Into branch
{ "accessToken": "${adminSession.accessToken}" }

Post /api/v1/admin/children Into child Using adminSession.accessToken
{ "first_name": "QA-AUTOTEST", "last_name": "DailyLog-${random()}", "dob": "${today("-42m")}", "branch_slug": "${branch.slug}" }
AssertStatus child 201

Body
Call CatchError ../../cases/dailylogapproval/DAILYLOG-TC-001-self-approval-blocked.bnrest.md
Call CatchError ../../cases/dailylogapproval/DAILYLOG-TC-002-second-approver.bnrest.md
Call CatchError ../../cases/dailylogapproval/DAILYLOG-TC-003-approval-notifications.bnrest.md

Teardown
Delete /api/v1/admin/children/${child.body.data.id} Using adminSession.accessToken
Call ../../utils/branch/BRANCH-FIX-002-archive-test-branch.bnrest.md With Json Into cleanup
{ "accessToken": "${adminSession.accessToken}", "slug": "${branch.slug}" }
```
