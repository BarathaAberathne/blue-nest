---
id: CHILDROOM-TC-A04
number: 2.9.4
type: Test Case
title: Placement into a full room is blocked without an override reason and allowed with one
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

# Capacity block, then authorised override

New coverage (`SUI-CHILDROOM-001`). Uses the capacity-1 `tinyRoom`
fixture, fills it with a throwaway child, then proves a second child is
blocked without — and allowed with — an override reason. Reads shared
`adminSession`/`branch`/`tinyRoom`/`child` fixtures.

```bnrest
Setup
Post /api/v1/admin/children Into filler Using adminSession.accessToken
{ "first_name": "QA-AUTOTEST", "last_name": "Filler-${random()}", "dob": "${today("-30m")}", "branch_slug": "${branch.slug}" }
AssertStatus filler 201
Post /api/v1/admin/child-room-assignments Into fill Using adminSession.accessToken
{ "child_id": "${filler.body.data.id}", "room_id": "${tinyRoom.id}" }
AssertStatus fill 201

Body
When Post /api/v1/admin/child-room-assignments Into blocked Using adminSession.accessToken
{ "child_id": "${child.id}", "room_id": "${tinyRoom.id}" }
Then AssertStatus blocked 400

When Post /api/v1/admin/child-room-assignments Into overridden Using adminSession.accessToken
{ "child_id": "${child.id}", "room_id": "${tinyRoom.id}", "override_reason": "manager approved extra place" }
Then AssertStatus overridden 201

Teardown
Patch /api/v1/admin/child-room-assignments/${overridden.body.data.id} Using adminSession.accessToken
{ "end": true }
Delete /api/v1/admin/children/${filler.body.data.id} Using adminSession.accessToken
