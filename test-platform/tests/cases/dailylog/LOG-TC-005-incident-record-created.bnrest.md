---
id: LOG-TC-005
number: 1.11.7
type: Test Case
title: An incident/accident record defaults to status Open and keeps its severity
owner: QA
mode: Standalone
status: Active
tags:
  - dailylog
  - golden-path
  - safeguarding
dependsOn: []
uses: []
fixtureScope: case
timeoutSeconds: 30
---

# Incident record created

Replaces legacy `DailyLogSuite.tc_log_005_incidentRecordCreated`. Reads
the shared `adminSession`/`branch` suite fixtures — see `SUI-LOG-001`.

```bnrest
Given Post /api/v1/admin/daily-records Into created Using adminSession.accessToken
{
  "type": "incident",
  "title": "QA-AUTOTEST Minor trip in garden",
  "branch_slug": "${branch.slug}",
  "detail": "Grazed knee, cleaned and plaster applied. Parent notified.",
  "severity": "low"
}
Then AssertStatus created 201
And Assert created.body.data.type == "incident"
And Assert created.body.data.status == "open"
And Assert created.body.data.severity == "low"

Teardown
Delete /api/v1/admin/daily-records/${created.body.data.id} Using adminSession.accessToken
```
