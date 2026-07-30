---
id: STAFFATT-TC-002
number: 1.10.12
type: Test Case
title: Clock-out closes the session; a manual correction on that existing record updates status and appends to its history
owner: QA
mode: Dependent
status: Active
tags:
  - staffatt
  - golden-path
dependsOn:
  - STAFFATT-TC-001
uses: []
fixtureScope: case
timeoutSeconds: 30
---

# Clock-out, then correct the existing record

Replaces legacy `StaffAttendanceSuite.tc_staffatt_002_clockOut` **and**
`tc_staffatt_003b_manualCorrectionOnExistingRecord` — merged into one case
because the correction test genuinely needs the exact record id clock-out
just returned, and this engine doesn't share variables between sibling
cases (only a suite's own `Setup` variables are inherited — see
`ENQUIRY-TC-001`'s doc for the same constraint). Genuinely
`dependsOn: [STAFFATT-TC-001]` — needs the staff member clocked in on the
same date (`2027-04-12`) first. Reads the shared `adminSession`/`staff`
suite fixtures — see `SUI-ATT-001`.

```bnrest
Given Post /api/v1/admin/staff-attendance/clock-out Into clocked Using adminSession.accessToken
{
  "staff_id": "${staff.body.data.id}",
  "date": "2027-04-12"
}
Then AssertStatus clocked 200
And Assert clocked.body.data.clock_out != null
And Assert clocked.body.data.worked_minutes >= 0

When Patch /api/v1/admin/staff-attendance/${clocked.body.data.id}/correct Into corrected Using adminSession.accessToken
{
  "staff_id": "${staff.body.data.id}",
  "date": "2027-04-12",
  "status": "sick",
  "reason": "QA-AUTOTEST correction — reclassified after the fact"
}
Then AssertStatus corrected 200
And Assert corrected.body.data.status == "sick"
And AssertJson corrected "$.body.data.corrections[?(@.field=='status')]" == 1
```
