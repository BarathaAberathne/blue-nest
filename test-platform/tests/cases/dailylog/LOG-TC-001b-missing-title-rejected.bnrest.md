---
id: LOG-TC-001b
number: 1.11.2
type: Test Case
title: A record with no title is rejected
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

# Missing title is rejected

Replaces legacy `DailyLogSuite.tc_log_001b_missingTitleRejected`. Reads
the shared `adminSession`/`branch` suite fixtures — see `SUI-LOG-001`.

```bnrest
Given Post /api/v1/admin/daily-records Into rejected Using adminSession.accessToken
{
  "type": "meal",
  "branch_slug": "${branch.slug}"
}
Then AssertStatus rejected 400
And AssertJson rejected $.body.error contains "title"
```
