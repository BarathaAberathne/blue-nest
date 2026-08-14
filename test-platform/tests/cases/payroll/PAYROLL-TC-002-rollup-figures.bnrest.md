---
id: PAYROLL-TC-002
number: 2.35.2
type: Test Case
title: The payroll roll-up aggregates worked hours and the leave taxonomy exactly as the register classified each day
owner: QA
mode: Standalone
status: Active
tags:
  - payroll
  - golden-path
dependsOn: []
uses: []
fixtureScope: case
timeoutSeconds: 30
---

# Roll-up figures match the register

One staff member gets four register days in the period: a corrected
present day 08:00–16:00 (create-on-correct → 480 worked minutes + 1
corrected day, not late vs the 09:00 threshold), one sick day, one annual
leave day and one unauthorised absence. The branch-scoped roll-up must
report exactly those per-type counts — same classification primitives as
the attendance hub (`models.IsWorking`/`AwayCategory`), so payroll can
never disagree with the register. Totals mirror the single row. Reads the
shared `adminSession`/`branch`/`staff` suite fixtures — see
`SUI-PAYROLL-001`.

```bnrest
Given Patch /api/v1/admin/staff-attendance/000000000000000000000000/correct Into worked Using adminSession.accessToken
{
  "staff_id": "${staff.body.data.id}",
  "date": "${today("+40w")}",
  "status": "present",
  "clock_in": "08:00",
  "clock_out": "16:00",
  "reason": "QA-AUTOTEST payroll fixture — full worked day"
}
Then AssertStatus worked 200

When Patch /api/v1/admin/staff-attendance/mark Into sick Using adminSession.accessToken
{ "staff_id": "${staff.body.data.id}", "date": "${today("+40w+1d")}", "status": "sick" }
Then AssertStatus sick 200

When Patch /api/v1/admin/staff-attendance/mark Into leave Using adminSession.accessToken
{ "staff_id": "${staff.body.data.id}", "date": "${today("+40w+2d")}", "status": "leave" }
Then AssertStatus leave 200

When Patch /api/v1/admin/staff-attendance/mark Into absent Using adminSession.accessToken
{ "staff_id": "${staff.body.data.id}", "date": "${today("+40w+3d")}", "status": "absent" }
Then AssertStatus absent 200

When Get /api/v1/admin/payroll?from=${today("+40w")}&to=${today("+40w+6d")}&branch=${branch.slug} Into payroll Using adminSession.accessToken
Then AssertStatus payroll 200
And AssertJson payroll "$.body.data.rows.length()" == 1
And AssertJson payroll "$.body.data.rows[0].staff_id" == "${staff.body.data.id}"
And AssertJson payroll "$.body.data.rows[0].worked_days" == 1
And AssertJson payroll "$.body.data.rows[0].worked_minutes" == 480
And AssertJson payroll "$.body.data.rows[0].late_count" == 0
And AssertJson payroll "$.body.data.rows[0].sick_days" == 1
And AssertJson payroll "$.body.data.rows[0].annual_leave_days" == 1
And AssertJson payroll "$.body.data.rows[0].absent_days" == 1
And AssertJson payroll "$.body.data.rows[0].corrected_days" == 1
And AssertJson payroll "$.body.data.totals.worked_minutes" == 480
And AssertJson payroll "$.body.data.totals.sick_days" == 1
```
