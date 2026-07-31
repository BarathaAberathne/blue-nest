---
id: CHILDROOM-TC-A03
number: 2.9.3
type: Test Case
title: A child cannot be placed in a room in a different branch
owner: QA
mode: Standalone
status: Active
tags:
  - childroom
  - regression
dependsOn: []
uses: []
fixtureScope: case
timeoutSeconds: 30
---

# Cross-branch child placement rejected

New coverage (`SUI-CHILDROOM-001`). Reads shared `adminSession`/`child`
(branch A) and `roomB` (branch B) fixtures.

```bnrest
Given Post /api/v1/admin/child-room-assignments Into rejected Using adminSession.accessToken
{ "child_id": "${child.id}", "room_id": "${roomB.id}" }
Then AssertStatus rejected 400
