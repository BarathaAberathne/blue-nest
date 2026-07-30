---
id: LOG-TC-005b
number: 1.11.8
type: Test Case
title: Deleting an incident is a real, non-recoverable delete — but is captured in the audit log
owner: QA
mode: Standalone
status: Active
tags:
  - dailylog
  - regression
  - safeguarding
dependsOn: []
uses: []
fixtureScope: case
timeoutSeconds: 30
---

# Delete is hard but audited (regression)

Replaces legacy `DailyLogSuite.tc_log_005b_deleteIsHardButAudited` — no
soft-delete/archive flag exists on `DailyRecord`; the "no silent delete"
requirement is met only via the admin audit log, not by preventing or
archiving the delete itself. Reads the shared `adminSession`/`branch`
suite fixtures — see `SUI-LOG-001`.

```bnrest
Given Post /api/v1/admin/daily-records Into created Using adminSession.accessToken
{
  "type": "incident",
  "title": "QA-AUTOTEST delete-and-audit check",
  "branch_slug": "${branch.slug}"
}
Then AssertStatus created 201

When Delete /api/v1/admin/daily-records/${created.body.data.id} Into deleted Using adminSession.accessToken
Then AssertStatus deleted 204

When Get /api/v1/admin/daily-records/${created.body.data.id} Into fetched Using adminSession.accessToken
Then AssertStatus fetched 404

When Get /api/v1/admin/audit-logs?entity_type=daily_record&action=delete&limit=50 Into audit Using adminSession.accessToken
Then AssertStatus audit 200
And AssertJson audit "$.body.data[?(@.entity_id=='${created.body.data.id}')]" == 1
```
