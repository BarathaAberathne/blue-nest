---
id: SUI-LOG-001
number: "1.11"
type: Test Suite
title: Daily Logs
owner: QA
mode: Standalone
status: Active
tags:
  - dailylog
---

# Daily Logs suite

Migrates legacy `DailyLogSuite`. Verified directly against
`internal/models/daily_record.go`: the real `DailyRecordType` enum is only
`observation | incident | safeguarding | medication | meal` — the plan's
separate "sleep"/"nappy" log types don't exist anywhere server-side, so no
test method exists for them (genuinely N/A, not a coverage gap). `Setup`
creates a dynamic branch; every case creates and tears down its own daily
records.

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
Call CatchError ../../cases/dailylog/LOG-TC-001-meal-log-created.bnrest.md
Call CatchError ../../cases/dailylog/LOG-TC-001b-missing-title-rejected.bnrest.md
Call CatchError ../../cases/dailylog/LOG-TC-001c-missing-branch-rejected.bnrest.md
Call CatchError ../../cases/dailylog/LOG-TC-001d-unknown-field-rejected.bnrest.md
Call CatchError ../../cases/dailylog/LOG-TC-004-observation-with-eyfs-areas.bnrest.md
Call CatchError ../../cases/dailylog/LOG-TC-004b-status-lifecycle.bnrest.md
Call CatchError ../../cases/dailylog/LOG-TC-005-incident-record-created.bnrest.md
Call CatchError ../../cases/dailylog/LOG-TC-005b-delete-is-hard-but-audited.bnrest.md
Call CatchError ../../cases/dailylog/LOG-TC-006-daily-summary-well-formed.bnrest.md
Call CatchError ../../cases/dailylog/LOG-TC-006b-unknown-record-rejected.bnrest.md

Teardown
Call ../../utils/branch/BRANCH-FIX-002-archive-test-branch.bnrest.md With Json Into cleanup
{
  "accessToken": "${adminSession.accessToken}",
  "slug": "${branch.slug}"
}
```
