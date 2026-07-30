---
id: LOG-TC-001d
number: 1.11.4
type: Test Case
title: An unknown field in the request body is rejected, not silently ignored
owner: QA
mode: Standalone
status: Active
tags:
  - dailylog
  - regression
dependsOn: []
uses: []
fixtureScope: case
timeoutSeconds: 30
---

# Unknown field is rejected

Replaces legacy `DailyLogSuite.tc_log_001d_unknownFieldRejected` — the
shared JSON decoder (`validator.DecodeJSON`) rejects any field not present
on the target struct (`sleep_start` doesn't exist on
`DailyRecordRequest`), rather than silently dropping it. Reads the shared
`adminSession`/`branch` suite fixtures — see `SUI-LOG-001`.

```bnrest
Given Post /api/v1/admin/daily-records Into rejected Using adminSession.accessToken
{
  "type": "meal",
  "title": "QA-AUTOTEST unknown field",
  "branch_slug": "${branch.slug}",
  "sleep_start": "12:00"
}
Then AssertStatus rejected 400
```
