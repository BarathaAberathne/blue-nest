---
id: SUI-AUDIT-001
number: "2.3"
type: Test Suite
title: Audit / Activity Log
owner: QA
mode: Standalone
status: Active
tags:
  - audit
---

# Audit / Activity Log suite

New coverage (no legacy equivalent). Verified against
`internal/models/audit_log.go` and `internal/handler/admin/audit_logs.go`.
`Setup` creates a dynamic branch shared by every case; each case creates
whatever it needs to trigger a deterministic audit entry.

```bnrest
Setup
Call ../../utils/auth/AUTH-UTIL-001-login.bnrest.md With Json Into adminSession
{
  "email": "admin@bluenest.uk",
  "password": "${secret:QA_ADMIN_PASSWORD}"
}

Call ../../utils/branch/BRANCH-FIX-001-create-test-branch.bnrest.md With Json Into branch
{
  "accessToken": "${adminSession.accessToken}"
}

Body
Call CatchError ../../cases/audit/AUDIT-TC-001-room-create-logged.bnrest.md
Call CatchError ../../cases/audit/AUDIT-TC-002-enquiry-status-change-logged.bnrest.md
Call CatchError ../../cases/audit/AUDIT-TC-003-limit-param-caps-results.bnrest.md

Teardown
Call ../../utils/branch/BRANCH-FIX-002-archive-test-branch.bnrest.md With Json Into cleanup
{
  "accessToken": "${adminSession.accessToken}",
  "slug": "${branch.slug}"
}
```
