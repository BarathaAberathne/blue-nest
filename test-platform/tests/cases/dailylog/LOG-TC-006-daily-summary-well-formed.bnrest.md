---
id: LOG-TC-006
number: 1.11.9
type: Test Case
title: The daily summary aggregation is well-formed and includes a by_type breakdown
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

# Daily summary is well-formed

Replaces legacy `DailyLogSuite.tc_log_006_dailySummaryWellFormed`. Creates
one of each real record type first so `by_type` genuinely has something to
report. Reads the shared `adminSession`/`branch` suite fixtures — see
`SUI-LOG-001`.

```bnrest
Setup
Post /api/v1/admin/daily-records Into meal Using adminSession.accessToken
{
  "type": "meal",
  "title": "QA-AUTOTEST summary meal",
  "branch_slug": "${branch.slug}",
  "meal_type": "lunch",
  "eaten": "all"
}
AssertStatus meal 201

Post /api/v1/admin/daily-records Into incident Using adminSession.accessToken
{
  "type": "incident",
  "title": "QA-AUTOTEST summary incident",
  "branch_slug": "${branch.slug}"
}
AssertStatus incident 201

Post /api/v1/admin/daily-records Into observation Using adminSession.accessToken
{
  "type": "observation",
  "title": "QA-AUTOTEST summary observation",
  "branch_slug": "${branch.slug}"
}
AssertStatus observation 201

Body
When Get /api/v1/admin/daily-records/stats?branch=${branch.slug} Into stats Using adminSession.accessToken
Then AssertStatus stats 200
And Assert stats.body.data.date != null
And Assert stats.body.data.meals_served >= 0
And AssertJson stats "$.body.data.by_type[?(@.label=='meal')]" == 1
And AssertJson stats "$.body.data.by_type[?(@.label=='incident')]" == 1
And AssertJson stats "$.body.data.by_type[?(@.label=='observation')]" == 1

Teardown
Delete /api/v1/admin/daily-records/${meal.body.data.id} Using adminSession.accessToken
Delete /api/v1/admin/daily-records/${incident.body.data.id} Using adminSession.accessToken
Delete /api/v1/admin/daily-records/${observation.body.data.id} Using adminSession.accessToken
```
