---
id: LEAVE-TC-004
number: 2.23.4
type: Test Case
title: Leave approval/decline notifications link to the profile leave tab, not a dead route
owner: QA
mode: Standalone
status: Active
tags:
  - leave
  - notifications
  - regression
dependsOn: []
uses: []
fixtureScope: case
timeoutSeconds: 30
---

# Leave notification links resolve (404 regression lock)

Found live: "Leave approved/declined" notifications linked to
`/admin/my-leave`, a route removed when leave moved into the My Profile hub —
every applicant clicking the notification hit a 404. The link is now
`/admin/profile?tab=leave` (and a frontend redirect covers old stored rows).
Reads shared `adminSession` (files the requests — so the applicant
notification goes to the admin user), `mgrSession` (approves/declines —
four-eyes) and `staff`.

```bnrest
Given Post /api/v1/admin/leave-requests Into lvA Using adminSession.accessToken
{ "staff_id": "${staff.id}", "type": "leave", "start_date": "${monday("+30w")}", "end_date": "${monday("+30w")}" }
Then AssertStatus lvA 201

When Post /api/v1/admin/leave-requests/${lvA.body.data.id}/approve Into approvedA Using mgrSession.accessToken
Then AssertStatus approvedA 200

When Get /api/v1/admin/notifications?limit=100 Into notifsA Using adminSession.accessToken
Then AssertStatus notifsA 200
And AssertJson notifsA "$.body.data.items[?(@.entity_id=='${lvA.body.data.id}' && @.type=='leave_approved')].link" == "/admin/profile?tab=leave"

Given Post /api/v1/admin/leave-requests Into lvB Using adminSession.accessToken
{ "staff_id": "${staff.id}", "type": "leave", "start_date": "${monday("+31w")}", "end_date": "${monday("+31w")}" }
Then AssertStatus lvB 201

When Post /api/v1/admin/leave-requests/${lvB.body.data.id}/decline Into declinedB Using mgrSession.accessToken
{ "reason": "QA-AUTOTEST coverage check" }
Then AssertStatus declinedB 200

When Get /api/v1/admin/notifications?limit=100 Into notifsB Using adminSession.accessToken
Then AssertStatus notifsB 200
And AssertJson notifsB "$.body.data.items[?(@.entity_id=='${lvB.body.data.id}' && @.type=='leave_declined')].link" == "/admin/profile?tab=leave"
```
