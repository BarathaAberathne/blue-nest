---
id: LEAVE-TC-002
number: 2.23.2
type: Test Case
title: Manager files leave for a staff member, and annual leave beyond the allowance is rejected
owner: QA
mode: Standalone
status: Active
tags:
  - leave
  - regression
dependsOn: []
uses: []
fixtureScope: case
timeoutSeconds: 30
---

# Manager-filed leave (Phase 4) + allowance cap (Phase 2)

New coverage (`SUI-LEAVE-001`). Reads the shared `adminSession`/`staff`
fixtures. A manager files leave for the staff member via the admin endpoint
(pending, four-eyes still applies); then an annual request beyond the
28-day default allowance is rejected.

```bnrest
Given Post /api/v1/admin/leave-requests Into filed Using adminSession.accessToken
{ "staff_id": "${staff.id}", "type": "unpaid_leave", "start_date": "${monday("+12w")}", "end_date": "${monday("+12w+2d")}" }
Then AssertStatus filed 201
And Assert filed.body.data.status == "pending"

When Patch /api/v1/leave-requests/${filed.body.data.id}/cancel Into cancelled Using adminSession.accessToken
Then AssertStatus cancelled 200

When Post /api/v1/admin/leave-requests Into tooMuch Using adminSession.accessToken
{ "staff_id": "${staff.id}", "type": "leave", "start_date": "${monday("+14w")}", "end_date": "${monday("+22w+4d")}" }
Then AssertStatus tooMuch 400
```
