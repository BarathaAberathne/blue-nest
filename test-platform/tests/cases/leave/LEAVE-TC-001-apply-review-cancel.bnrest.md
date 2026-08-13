---
id: LEAVE-TC-001
number: 2.23.1
type: Test Case
title: Apply for leave, see it in the review queue, four-eyes blocks self-approval, applicant cancels
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

# Leave request lifecycle (single-user paths)

New coverage (`SUI-LEAVE-001`). Reads the shared `adminSession`/`staff`
fixtures. A manager files leave for the staff member via the MANAGER route
(`/admin/leave-requests`, staff_id supplied — the self-service route rejects a
staff_id with 403, regression-locked below: any staff member could otherwise
file/consume leave in a colleague's name);
Mon–Fri (monday("+10w") anchored) is 5 working days; the request shows in the pending queue; the SAME
user who applied cannot approve it (four-eyes → 400); the applicant cancels
their own pending request; and a reversed date range is rejected.

```bnrest
Given Post /api/v1/leave-requests Into selfRouteStaffID Using adminSession.accessToken
{ "staff_id": "${staff.id}", "type": "leave", "start_date": "${monday("+11w")}", "end_date": "${monday("+11w+4d")}", "reason": "QA-AUTOTEST authz probe" }
Then AssertStatus selfRouteStaffID 403

Given Post /api/v1/admin/leave-requests Into applied Using adminSession.accessToken
{ "staff_id": "${staff.id}", "type": "leave", "start_date": "${monday("+10w")}", "end_date": "${monday("+10w+4d")}", "reason": "QA-AUTOTEST holiday" }
Then AssertStatus applied 201
And Assert applied.body.data.status == "pending"
And Assert applied.body.data.days == 5

When Get /api/v1/admin/leave-requests?status=pending Into queue Using adminSession.accessToken
Then AssertStatus queue 200
And AssertJson queue "$.body.data[?(@.id=='${applied.body.data.id}')].length()" == 1

When Post /api/v1/admin/leave-requests/${applied.body.data.id}/approve Into selfApprove Using adminSession.accessToken
Then AssertStatus selfApprove 400

When Patch /api/v1/leave-requests/${applied.body.data.id}/cancel Into cancelled Using adminSession.accessToken
Then AssertStatus cancelled 200
And Assert cancelled.body.data.status == "cancelled"

When Post /api/v1/admin/leave-requests Into badRange Using adminSession.accessToken
{ "staff_id": "${staff.id}", "type": "leave", "start_date": "${monday("+10w+4d")}", "end_date": "${monday("+10w")}" }
Then AssertStatus badRange 400
```
