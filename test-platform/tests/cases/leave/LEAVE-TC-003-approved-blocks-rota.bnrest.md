---
id: LEAVE-TC-003
number: 2.23.3
type: Test Case
title: Approved leave blocks the staff member from being rostered on those dates
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

# Approved leave blocks the rota

New coverage (`SUI-LEAVE-001`). Reads shared `adminSession` (files + rosters),
`mgrSession` (a branch-manager login that approves — four-eyes), `staff` and
`branch`. Files annual leave Mon–Fri, a manager approves it, then a rota shift
on a leave date is rejected while a shift outside the leave dates succeeds.

```bnrest
Given Post /api/v1/admin/leave-requests Into lv Using adminSession.accessToken
{ "staff_id": "${staff.id}", "type": "leave", "start_date": "2026-11-02", "end_date": "2026-11-06" }
Then AssertStatus lv 201

When Post /api/v1/admin/leave-requests/${lv.body.data.id}/approve Into approved Using mgrSession.accessToken
Then AssertStatus approved 200
And Assert approved.body.data.status == "approved"

When Post /api/v1/admin/shifts Into blocked Using adminSession.accessToken
{ "staff_id": "${staff.id}", "date": "2026-11-03", "start_time": "09:00", "end_time": "17:00" }
Then AssertStatus blocked 400

When Post /api/v1/admin/shifts Into rostered Using adminSession.accessToken
{ "staff_id": "${staff.id}", "date": "2026-11-09", "start_time": "09:00", "end_time": "17:00" }
Then AssertStatus rostered 201

Teardown
Delete /api/v1/admin/shifts/${rostered.body.data.id} Using adminSession.accessToken
```
