---
id: LOG-TC-EXIT6
number: 1.13.2
type: Test Case
title: A rapid identical daily-record resubmit merges into one record, but a genuinely different entry the same day does not
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

# Duplicate debounce vs. a genuinely distinct entry

Replaces legacy `DailyLogSuite.tc_exitcriteria_duplicateDailyRecordDebounced`
— a regression lock on `dailyRecordService.recentDuplicate`'s 5-second
exact-resubmit debounce, proving it does NOT also swallow a real second
entry that merely shares child+day. Reads the shared `adminSession`/
`branch` suite fixtures — see `SUI-NET-001`. Belongs to "Network and
Endpoint Validation" (duplicate-call semantics), not `SUI-LOG-001`, per
`docs/testing/test-migration-map.md`.

```bnrest
Given Post /api/v1/admin/daily-records Into first Using adminSession.accessToken
{
  "type": "meal",
  "title": "QA-AUTOTEST Duplicate Debounce Lunch",
  "branch_slug": "${branch.slug}",
  "meal_type": "lunch",
  "eaten": "most",
  "child_id": "000000000000000000000099"
}
Then AssertStatus first 201

When Post /api/v1/admin/daily-records Into second Using adminSession.accessToken
{
  "type": "meal",
  "title": "QA-AUTOTEST Duplicate Debounce Lunch",
  "branch_slug": "${branch.slug}",
  "meal_type": "lunch",
  "eaten": "most",
  "child_id": "000000000000000000000099"
}
Then AssertStatus second 201
And Assert second.body.data.id == first.body.data.id

When Post /api/v1/admin/daily-records Into third Using adminSession.accessToken
{
  "type": "meal",
  "title": "QA-AUTOTEST Duplicate Debounce Snack",
  "branch_slug": "${branch.slug}",
  "meal_type": "snack",
  "eaten": "all",
  "child_id": "000000000000000000000099"
}
Then AssertStatus third 201
And Assert third.body.data.id != first.body.data.id

Teardown
Delete /api/v1/admin/daily-records/${first.body.data.id} Using adminSession.accessToken
Delete /api/v1/admin/daily-records/${third.body.data.id} Using adminSession.accessToken
```
