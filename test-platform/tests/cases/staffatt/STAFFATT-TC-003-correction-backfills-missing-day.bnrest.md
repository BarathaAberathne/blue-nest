---
id: STAFFATT-TC-003
number: 1.10.14
type: Test Case
title: A manual correction backfills a day the kiosk never captured (create-on-correct), audited with a reason
owner: QA
mode: Standalone
status: Active
tags:
  - staffatt
  - golden-path
dependsOn: []
uses: []
fixtureScope: case
timeoutSeconds: 30
---

# Correction backfills a missing day (create-on-correct)

Replaces legacy `StaffAttendanceSuite.tc_staffatt_003_manualCorrectionBackfillsMissingDay`
— no record exists yet for this staff/date; `PATCH .../{anyId}/correct`
materialises one from `staff_id` + `date`. Reads the shared
`adminSession`/`staff` suite fixtures — see `SUI-ATT-001`.

```bnrest
Given Patch /api/v1/admin/staff-attendance/000000000000000000000000/correct Into backfilled Using adminSession.accessToken
{
  "staff_id": "${staff.body.data.id}",
  "date": "2027-04-15",
  "status": "present",
  "reason": "QA-AUTOTEST backfill — kiosk never captured this shift"
}
Then AssertStatus backfilled 200
And Assert backfilled.body.data.status == "present"
And AssertJson backfilled "$.body.data.corrections[?(@.field=='status')]" == 1
```
