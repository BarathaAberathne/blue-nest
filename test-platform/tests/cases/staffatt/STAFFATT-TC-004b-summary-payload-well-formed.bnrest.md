---
id: STAFFATT-TC-004b
number: 1.10.16
type: Test Case
title: The attendance-summary KPI payload is well-formed for a scoped branch/date
owner: QA
mode: Standalone
status: Active
tags:
  - staffatt
dependsOn: []
uses: []
fixtureScope: case
timeoutSeconds: 30
---

# Summary payload is well-formed

Replaces legacy `StaffAttendanceSuite.tc_staffatt_004b_summaryPayloadWellFormed`.
Reads the shared `adminSession`/`branch` suite fixtures — see
`SUI-ATT-001`.

```bnrest
Given Get /api/v1/admin/staff-attendance/summary?date=${today("+32w")}&branch=${branch.slug} Into summary Using adminSession.accessToken
Then AssertStatus summary 200
And Assert summary.body.data.date == today("+32w")
And Assert summary.body.data.total >= 0
And Assert summary.body.data.attendance_rate >= 0
And Assert summary.body.data.attendance_rate <= 100
```
