---
id: CHILDATT-TC-004b
number: 1.10.6
type: Test Case
title: Re-checking in after a check-out (same day, e.g. re-entry) is allowed and clears the stale check-out
owner: QA
mode: Dependent
status: Active
tags:
  - childatt
dependsOn:
  - CHILDATT-TC-002
uses: []
fixtureScope: case
timeoutSeconds: 30
---

# Re-checkin clears stale check-out

Replaces legacy
`ChildAttendanceSuite.tc_childatt_004b_reCheckinAfterCheckoutClearsStaleCheckout`.
Genuinely `dependsOn: [CHILDATT-TC-002]` — needs the child already checked
out on `2027-03-15`. `check_out` is `omitempty` on the wire, so its
absence after clearing can't be asserted directly with this engine's
strict path resolution (see `CHILDROOM-TC-002c`'s note) — this checks the
re-checkin succeeds, which is the meaningful behaviour.

```bnrest
Given Post /api/v1/admin/attendance/check-in Into reCheckedIn Using adminSession.accessToken
{
  "child_id": "${child.body.data.id}",
  "date": "2027-03-15"
}
Then AssertStatus reCheckedIn 200
And Assert reCheckedIn.body.data.status == "present"
```
