---
id: LOG-TC-006b
number: 1.11.10
type: Test Case
title: Fetching a nonexistent daily record is rejected with 404, not a 500
owner: QA
mode: Standalone
status: Active
tags:
  - dailylog
dependsOn: []
uses: []
fixtureScope: case
timeoutSeconds: 30
---

# Unknown daily record is a clean 404

Replaces legacy `DailyLogSuite.tc_log_006b_unknownRecordRejected`. Reads
the shared `adminSession` suite fixture — see `SUI-LOG-001`.

```bnrest
Given Get /api/v1/admin/daily-records/000000000000000000000000 Into rejected Using adminSession.accessToken
Then AssertStatus rejected 404
```
