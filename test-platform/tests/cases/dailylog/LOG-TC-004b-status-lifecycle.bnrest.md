---
id: LOG-TC-004b
number: 1.11.6
type: Test Case
title: An observation's status can be moved through its real lifecycle (logged -> resolved)
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

# Observation status lifecycle

Replaces legacy `DailyLogSuite.tc_log_004b_statusLifecycle`. Reads the
shared `adminSession`/`branch` suite fixtures — see `SUI-LOG-001`.

```bnrest
Setup
Post /api/v1/admin/daily-records Into created Using adminSession.accessToken
{
  "type": "observation",
  "title": "QA-AUTOTEST status lifecycle",
  "branch_slug": "${branch.slug}"
}
AssertStatus created 201

Body
When Patch /api/v1/admin/daily-records/${created.body.data.id}/status Into updated Using adminSession.accessToken
{
  "status": "resolved"
}
Then AssertStatus updated 200
And Assert updated.body.data.status == "resolved"

Teardown
Delete /api/v1/admin/daily-records/${created.body.data.id} Using adminSession.accessToken
```
