---
id: LOG-TC-001c
number: 1.11.3
type: Test Case
title: A record with no branch_slug is rejected
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

# Missing branch is rejected

Replaces legacy `DailyLogSuite.tc_log_001c_missingBranchRejected`. Reads
the shared `adminSession` suite fixture — see `SUI-LOG-001`.

```bnrest
Given Post /api/v1/admin/daily-records Into rejected Using adminSession.accessToken
{
  "type": "meal",
  "title": "QA-AUTOTEST no branch"
}
Then AssertStatus rejected 400
And AssertJson rejected $.body.error contains "branch"
```
