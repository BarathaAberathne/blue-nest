---
id: STAFFATT-TC-005
number: 1.10.20
type: Test Case
title: The day-summary reports each leave type distinctly (sick vs dependant vs maternity vs unpaid vs annual)
owner: QA
mode: Standalone
status: Active
tags:
  - staffatt
  - regression
dependsOn: []
uses: []
fixtureScope: case
timeoutSeconds: 30
---

# Leave & absence taxonomy is broken out, not lumped into "on leave"

Regression lock for the finding that the attendance-hub day-summary folded
**sick** (and every other away-kind) into a single `on_leave` number, so a
manager could not tell annual leave from sickness / dependant care /
maternity / unpaid leave. The summary now carries a per-type breakdown
(`sick`, `dependant_sick`, `maternity`, `unpaid_leave`, `annual_leave`,
`other_away`) whose sum is `on_leave`. One staff member is re-marked through
each status on the same dedicated date; the branch/date is scoped so every
count is deterministically 1/0. Reads the shared `adminSession`/`staff`/
`branch` fixtures — see `SUI-ATT-001`.

```bnrest
When Patch /api/v1/admin/staff-attendance/mark Into m1 Using adminSession.accessToken
{ "staff_id": "${staff.body.data.id}", "date": "${today("+33w")}", "status": "sick" }
Then AssertStatus m1 200
And Get /api/v1/admin/staff-attendance/summary?date=${today("+33w")}&branch=${branch.slug} Into s1 Using adminSession.accessToken
And Assert s1.body.data.sick == 1
And Assert s1.body.data.on_leave == 1
And Assert s1.body.data.absent == 0

When Patch /api/v1/admin/staff-attendance/mark Into m2 Using adminSession.accessToken
{ "staff_id": "${staff.body.data.id}", "date": "${today("+33w")}", "status": "dependant_sick" }
Then AssertStatus m2 200
And Get /api/v1/admin/staff-attendance/summary?date=${today("+33w")}&branch=${branch.slug} Into s2 Using adminSession.accessToken
And Assert s2.body.data.dependant_sick == 1
And Assert s2.body.data.sick == 0
And Assert s2.body.data.on_leave == 1

When Patch /api/v1/admin/staff-attendance/mark Into m3 Using adminSession.accessToken
{ "staff_id": "${staff.body.data.id}", "date": "${today("+33w")}", "status": "maternity" }
Then AssertStatus m3 200
And Get /api/v1/admin/staff-attendance/summary?date=${today("+33w")}&branch=${branch.slug} Into s3 Using adminSession.accessToken
And Assert s3.body.data.maternity == 1
And Assert s3.body.data.on_leave == 1

When Patch /api/v1/admin/staff-attendance/mark Into m4 Using adminSession.accessToken
{ "staff_id": "${staff.body.data.id}", "date": "${today("+33w")}", "status": "unpaid_leave" }
Then AssertStatus m4 200
And Get /api/v1/admin/staff-attendance/summary?date=${today("+33w")}&branch=${branch.slug} Into s4 Using adminSession.accessToken
And Assert s4.body.data.unpaid_leave == 1
And Assert s4.body.data.on_leave == 1
```
