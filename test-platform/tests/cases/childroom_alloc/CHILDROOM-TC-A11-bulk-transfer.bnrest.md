---
id: CHILDROOM-TC-A11
number: 2.9.11
type: Test Case
title: Bulk transfer moves a cohort through the canonical per-child guards
owner: QA
mode: Standalone
status: Active
tags:
  - childroom
  - regression
dependsOn: []
uses:
  - CHILD-UTIL-003
  - ROOM-UTIL-001
  - CHILDROOM-UTIL-001
fixtureScope: case
timeoutSeconds: 40
---

# Bulk transfer (age-group promotion)

`POST /admin/child-room-assignments/bulk-transfer` moves several children
into ONE room — the "cohort moves up to the next age-group room" action.
It is a thin loop over the canonical Transfer, so every per-child guard
applies and capacity is consumed incrementally: moving two children into a
capacity-1 room succeeds for exactly one and fails the other with a
capacity error (a partial batch is a 200 with per-child rows, never an
all-or-nothing abort). An empty selection is a 400.

```bnrest
Body
Call ../../utils/child/CHILD-UTIL-003-create-child-direct.bnrest.md With Json Into kidA
{ "accessToken": "${adminSession.accessToken}", "branchSlug": "${branch.slug}", "firstName": "QA-AUTOTEST", "lastName": "BulkA-${random()}", "dob": "${today("-30m")}" }
Call ../../utils/child/CHILD-UTIL-003-create-child-direct.bnrest.md With Json Into kidB
{ "accessToken": "${adminSession.accessToken}", "branchSlug": "${branch.slug}", "firstName": "QA-AUTOTEST", "lastName": "BulkB-${random()}", "dob": "${today("-30m")}" }

Call ../../utils/childroom/CHILDROOM-UTIL-001-allocate-child.bnrest.md With Json Into placeA
{ "accessToken": "${adminSession.accessToken}", "childId": "${kidA.id}", "roomId": "${room.id}", "overrideReason": "" }
Call ../../utils/childroom/CHILDROOM-UTIL-001-allocate-child.bnrest.md With Json Into placeB
{ "accessToken": "${adminSession.accessToken}", "childId": "${kidB.id}", "roomId": "${room.id}", "overrideReason": "" }

# The whole cohort moves up — both succeed.
When Post /api/v1/admin/child-room-assignments/bulk-transfer Into moved Using adminSession.accessToken
{ "child_ids": ["${kidA.id}", "${kidB.id}"], "room_id": "${room2.id}", "reason": "QA-AUTOTEST moved up to the next age group" }
Then AssertStatus moved 200
And Assert moved.body.data.moved == 2
And AssertJson moved "$.body.data.results[?(@.ok == true)]" == 2

When Get /api/v1/admin/children/${kidA.id} Into checkA Using adminSession.accessToken
Then Assert checkA.body.data.room_id == room2.id

# Into a fresh capacity-1 room: exactly one fits, the other fails alone.
Call ../../utils/room/ROOM-UTIL-001-create-room.bnrest.md With Json Into capOne
{ "accessToken": "${adminSession.accessToken}", "branchSlug": "${branch.slug}", "name": "QA-AUTOTEST-BulkTiny-${random()}", "ageRange": "0-5 years", "capacity": 1 }

When Post /api/v1/admin/child-room-assignments/bulk-transfer Into partial Using adminSession.accessToken
{ "child_ids": ["${kidA.id}", "${kidB.id}"], "room_id": "${capOne.id}", "reason": "QA-AUTOTEST capacity split" }
Then AssertStatus partial 200
And Assert partial.body.data.moved == 1
And AssertJson partial "$.body.data.results[?(@.ok == true)]" == 1
And AssertJson partial "$.body.data.results[?(@.ok == false)]" == 1

# Empty selection is rejected outright.
When Post /api/v1/admin/child-room-assignments/bulk-transfer Into empty Using adminSession.accessToken
{ "child_ids": [], "room_id": "${room2.id}", "reason": "QA-AUTOTEST empty" }
Then AssertStatus empty 400

Teardown
Delete /api/v1/admin/children/${kidA.id} Using adminSession.accessToken
Delete /api/v1/admin/children/${kidB.id} Using adminSession.accessToken
```
