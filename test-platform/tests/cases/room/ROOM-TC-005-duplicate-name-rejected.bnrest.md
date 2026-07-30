---
id: ROOM-TC-005
number: 1.3.5
type: Test Case
title: Duplicate room name within the same branch is rejected
owner: QA
mode: Standalone
status: Active
tags:
  - room
  - regression
dependsOn: []
uses:
  - AUTH-UTIL-001
  - BRANCH-FIX-001
  - BRANCH-FIX-002
  - ROOM-UTIL-001
fixtureScope: case
timeoutSeconds: 30
---

# Duplicate room name (same branch) is rejected

Replaces legacy `RoomSuite.tc_room_002_duplicateNameSameBranchRejected` —
another regression lock from the same real defect as `ROOM-TC-003`/`004`.
The legacy test reused the real, pre-existing "Toddlers" room at Harrow;
this creates its own "Toddlers" room in its own throwaway branch first
(via `ROOM-UTIL-001`), so the duplicate-name invariant is proven
self-contained rather than depending on Harrow's specific seeded data.

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

Call ../../utils/room/ROOM-UTIL-001-create-room.bnrest.md With Json Into original
{
  "accessToken": "${session.accessToken}",
  "branchSlug": "${branch.slug}",
  "name": "Toddlers",
  "ageRange": "2-3 years",
  "capacity": 10
}

Body
When Post /api/v1/admin/rooms Into rejected Using session.accessToken
{
  "branch_slug": "${branch.slug}",
  "name": "Toddlers",
  "age_range": "2-3 years",
  "capacity": 10
}
Then AssertStatus rejected 400
And AssertJson rejected $.body.error contains "already exists"

Teardown
Delete /api/v1/admin/rooms/${original.id} Using session.accessToken
Call ../../utils/branch/BRANCH-FIX-002-archive-test-branch.bnrest.md With Json Into cleanup
{
  "accessToken": "${session.accessToken}",
  "slug": "${branch.slug}"
}
```
