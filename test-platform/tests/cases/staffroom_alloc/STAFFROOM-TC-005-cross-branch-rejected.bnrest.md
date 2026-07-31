---
id: STAFFROOM-TC-005
number: 2.8.5
type: Test Case
title: A staff member cannot be allocated to a room in a different branch
owner: QA
mode: Standalone
status: Active
tags:
  - staffroom
  - regression
dependsOn: []
uses: []
fixtureScope: case
timeoutSeconds: 30
---

# Cross-branch staff allocation rejected

New coverage (`SUI-STAFFROOM-001`). Reads shared `adminSession`/`staff`
(branch A) and `roomB` (branch B) fixtures.

```bnrest
Given Post /api/v1/admin/staff-room-assignments Into rejected Using adminSession.accessToken
{ "staff_id": "${staff.id}", "room_id": "${roomB.id}" }
Then AssertStatus rejected 400
