---
id: CHILDROOM-TC-004-REG
number: 1.9.8
type: Test Case
title: A room-only update does NOT wipe allergies or medical notes
owner: QA
mode: Standalone
status: Active
tags:
  - childroom
  - regression
  - safeguarding
dependsOn: []
uses: []
fixtureScope: case
timeoutSeconds: 30
---

# Room-only update preserves safety fields (Critical/safeguarding regression)

Replaces legacy `ChildRoomSuite.tc_childroom_004_reg_partialUpdatePreservesSafetyFields`
— a second regression found after the DOB fix: `allergies`/`medical_notes`/
`dietary_reqs` were still unconditionally overwritten by a room-only
update, silently erasing real safeguarding data. Reads the shared
`adminSession`/`branch`/`room` suite fixtures — see `SUI-ASSIGN-001`.

```bnrest
Setup
Post /api/v1/admin/children Into fixture Using adminSession.accessToken
{
  "first_name": "QA-AUTOTEST",
  "last_name": "SafetyWipeCheck-${random()}",
  "dob": "2026-03-01",
  "branch_slug": "${branch.slug}",
  "allergies": "Peanuts - severe",
  "medical_notes": "EpiPen in bag",
  "dietary_reqs": "No dairy"
}
AssertStatus fixture 201

Body
When Put /api/v1/admin/children/${fixture.body.data.id} Into updated Using adminSession.accessToken
{
  "branch_slug": "${branch.slug}",
  "room_id": "${room.id}"
}
Then AssertStatus updated 200
And Assert updated.body.data.allergies == "Peanuts - severe"
And Assert updated.body.data.medical_notes == "EpiPen in bag"
And Assert updated.body.data.dietary_reqs == "No dairy"

Teardown
Delete /api/v1/admin/children/${fixture.body.data.id} Using adminSession.accessToken
```
