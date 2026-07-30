---
id: CHILDROOM-TC-A09
number: 2.9.9
type: Test Case
title: Placement into an age-restricted room is blocked for an out-of-range child and allowed with an override reason
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

# Age-range block, then authorised override

New coverage (`SUI-CHILDROOM-001`). Locks the backend guarantee that the
child create/registration UI's compensating rollback relies on: allocating
an out-of-range child to an age-restricted room is rejected (`400`,
`ErrAgeMismatch`) and only succeeds with a non-empty `override_reason`.
Fully self-contained — creates its own age-restricted room
(`min_age_months` 48) and its own clearly-too-young child so it never
collides with the shared `child` fixture's other placements. Reads shared
`adminSession`/`branch`.

```bnrest
Setup
Post /api/v1/admin/rooms Into ageRoom Using adminSession.accessToken
{ "branch_slug": "${branch.slug}", "name": "QA-AUTOTEST-Preschool-${random()}", "age_range": "4-5 years", "min_age_months": 48, "max_age_months": 60, "capacity": 10 }
AssertStatus ageRoom 201

Post /api/v1/admin/children Into youngChild Using adminSession.accessToken
{ "first_name": "QA-AUTOTEST", "last_name": "TooYoung-${random()}", "dob": "2024-01-01", "branch_slug": "${branch.slug}" }
AssertStatus youngChild 201

Body
When Post /api/v1/admin/child-room-assignments Into blocked Using adminSession.accessToken
{ "child_id": "${youngChild.body.data.id}", "room_id": "${ageRoom.body.data.id}" }
Then AssertStatus blocked 400

When Post /api/v1/admin/child-room-assignments Into overridden Using adminSession.accessToken
{ "child_id": "${youngChild.body.data.id}", "room_id": "${ageRoom.body.data.id}", "override_reason": "SENCo approved early transition" }
Then AssertStatus overridden 201

Teardown
Patch /api/v1/admin/child-room-assignments/${overridden.body.data.id} Using adminSession.accessToken
{ "end": true }
Delete /api/v1/admin/children/${youngChild.body.data.id} Using adminSession.accessToken
Delete /api/v1/admin/rooms/${ageRoom.body.data.id} Using adminSession.accessToken
```
