---
id: KEY-TC-006
number: 1.6.6
type: Test Case
title: The key-person PATCH response keeps the child's room projection (regression)
owner: QA
mode: Standalone
status: Active
tags:
  - key-person
  - regression
dependsOn: []
uses:
  - AUTH-UTIL-001
  - BRANCH-FIX-001
  - BRANCH-FIX-002
  - STAFF-UTIL-001
  - CHILD-UTIL-003
  - ROOM-UTIL-001
  - CHILDROOM-UTIL-001
fixtureScope: case
timeoutSeconds: 30
---

# Key-person save must not blank the room (projection regression lock)

Found live: assigning a key person to a child who already had a room made
the room show BLANK until a page refresh — `childService.SetKeyPerson`
re-resolved only the key-person projection, not room/guardians, and the UI
replaces its state with the write response. Locked here by asserting the
RAW `PATCH /admin/children/{id}/key-person` response (deliberately not via
`KEY-UTIL-001`, whose output doesn't expose the room): after the save, the
response body still carries `room_id`/`room_name`. Every child write path
now projects through one shared `childService.project`.

```bnrest
Setup
Call ../../utils/auth/AUTH-UTIL-001-login.bnrest.md With Json Into session
{
  "email": "admin@bluenest.uk",
  "password": "${secret:QA_ADMIN_PASSWORD}"
}

Call ../../utils/branch/BRANCH-FIX-001-create-test-branch.bnrest.md With Json Into branch
{
  "accessToken": "${session.accessToken}"
}

Set suffix = random()
Call ../../utils/staff/STAFF-UTIL-001-create-staff.bnrest.md With Json Into staff
{
  "accessToken": "${session.accessToken}",
  "firstName": "QA-AUTOTEST",
  "lastName": "Key006Staff-${suffix}",
  "email": "qa-autotest-key006-staff-${suffix}@bluenest.test",
  "branchSlug": "${branch.slug}",
  "jobTitle": "Practitioner",
  "enableLogin": false,
  "loginRole": "",
  "loginPassword": ""
}

Call ../../utils/child/CHILD-UTIL-003-create-child-direct.bnrest.md With Json Into child
{
  "accessToken": "${session.accessToken}",
  "branchSlug": "${branch.slug}",
  "firstName": "QA-AUTOTEST",
  "lastName": "Key006Child-${suffix}",
  "dob": "${today("-3y")}"
}

Call ../../utils/room/ROOM-UTIL-001-create-room.bnrest.md With Json Into room
{
  "accessToken": "${session.accessToken}",
  "branchSlug": "${branch.slug}",
  "name": "QA-AUTOTEST Key006 Room ${suffix}",
  "ageRange": "2-5",
  "capacity": 10
}

Call ../../utils/childroom/CHILDROOM-UTIL-001-allocate-child.bnrest.md With Json Into placement
{
  "accessToken": "${session.accessToken}",
  "childId": "${child.id}",
  "roomId": "${room.id}",
  "overrideReason": "QA-AUTOTEST projection regression fixture"
}

Body
When Patch /api/v1/admin/children/${child.id}/key-person Into resp Using session.accessToken
{ "staff_id": "${staff.id}" }
Then AssertStatus resp 200
And Assert resp.body.data.key_person_id == staff.id
And Assert resp.body.data.room_id == room.id
And Assert resp.body.data.room_name == room.name

Teardown
Delete /api/v1/admin/children/${child.id} Using session.accessToken
Delete /api/v1/admin/staff/${staff.id} Using session.accessToken
Call ../../utils/branch/BRANCH-FIX-002-archive-test-branch.bnrest.md With Json Into cleanup
{
  "accessToken": "${session.accessToken}",
  "slug": "${branch.slug}"
}
```
