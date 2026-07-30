---
id: LOG-TC-004
number: 1.11.5
type: Test Case
title: An activity/observation log persists its EYFS areas and next steps
owner: QA
mode: Standalone
status: Active
tags:
  - dailylog
  - golden-path
dependsOn: []
uses: []
fixtureScope: case
timeoutSeconds: 30
---

# Observation persists EYFS areas and next steps

Replaces legacy `DailyLogSuite.tc_log_004_observationWithEyfsAreas`. Reads
the shared `adminSession`/`branch` suite fixtures — see `SUI-LOG-001`.

```bnrest
Given Post /api/v1/admin/daily-records Into created Using adminSession.accessToken
{
  "type": "observation",
  "title": "QA-AUTOTEST Independent mark-making",
  "branch_slug": "${branch.slug}",
  "detail": "Drew shapes unprompted during free play",
  "eyfs_areas": ["Literacy", "Physical Development"],
  "next_steps": "Offer more mark-making tools"
}
Then AssertStatus created 201
And AssertJson created $.body.data.eyfs_areas contains "Literacy"
And AssertJson created $.body.data.eyfs_areas contains "Physical Development"
And Assert created.body.data.next_steps == "Offer more mark-making tools"
And Assert created.body.data.status == "logged"

Teardown
Delete /api/v1/admin/daily-records/${created.body.data.id} Using adminSession.accessToken
```
