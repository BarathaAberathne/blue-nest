---
id: LOG-TC-001
number: 1.11.1
type: Test Case
title: A meal log is created with meal_type/eaten, a minted ref, and the type's default status
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

# Meal log created

Replaces legacy `DailyLogSuite.tc_log_001_mealLogCreated`. Reads the
shared `adminSession`/`branch` suite fixtures — see `SUI-LOG-001`.

```bnrest
Given Post /api/v1/admin/daily-records Into created Using adminSession.accessToken
{
  "type": "meal",
  "title": "QA-AUTOTEST Lunch served",
  "branch_slug": "${branch.slug}",
  "meal_type": "lunch",
  "eaten": "most"
}
Then AssertStatus created 201
And Assert created.body.data.type == "meal"
And Assert created.body.data.meal_type == "lunch"
And Assert created.body.data.eaten == "most"
And Assert created.body.data.status == "logged"
And AssertJson created $.body.data.ref contains "LOG-"

Teardown
Delete /api/v1/admin/daily-records/${created.body.data.id} Using adminSession.accessToken
```
