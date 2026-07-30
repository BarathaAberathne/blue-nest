---
id: ROOM-TC-006
number: 1.3.6
type: Test Case
title: The same room name is allowed in a different branch, not the same one twice
owner: QA
mode: Standalone
status: Active
tags:
  - room
dependsOn: []
uses:
  - AUTH-UTIL-001
  - BRANCH-FIX-001
  - BRANCH-FIX-002
  - ROOM-UTIL-001
fixtureScope: case
timeoutSeconds: 30
---

# Cross-branch name reuse is allowed; same-branch reuse still isn't

Replaces legacy `RoomSuite.tc_room_002b_sameNameDifferentBranchAllowed`.
**Improves on both the legacy test and this platform's own first bnrest
port of it**: the legacy code's own body only ever posted to Harrow twice
(despite its name/comment claiming to prove cross-branch behaviour) — it
never actually exercised a second branch. Now that dynamic branch fixtures
exist, this creates **two independent throwaway branches** and genuinely
proves: the same name succeeds in both (true cross-branch independence),
and only fails when reused a second time in the *same* branch.

```bnrest
Setup
Call ../../utils/auth/AUTH-UTIL-001-login.bnrest.md With Json Into session
{
  "email": "admin@bluenest.uk",
  "password": "${secret:QA_ADMIN_PASSWORD}"
}

Call ../../utils/branch/BRANCH-FIX-001-create-test-branch.bnrest.md With Json Into branchA
{
  "accessToken": "${session.accessToken}"
}

Call ../../utils/branch/BRANCH-FIX-001-create-test-branch.bnrest.md With Json Into branchB
{
  "accessToken": "${session.accessToken}"
}

Set roomSuffix = random()

Body
Call ../../utils/room/ROOM-UTIL-001-create-room.bnrest.md With Json Into roomA
{
  "accessToken": "${session.accessToken}",
  "branchSlug": "${branchA.slug}",
  "name": "QA-AUTOTEST-CrossBranch-${roomSuffix}",
  "ageRange": "2-3 years",
  "capacity": 5
}
Assert roomA.id != null

Call ../../utils/room/ROOM-UTIL-001-create-room.bnrest.md With Json Into roomB
{
  "accessToken": "${session.accessToken}",
  "branchSlug": "${branchB.slug}",
  "name": "QA-AUTOTEST-CrossBranch-${roomSuffix}",
  "ageRange": "2-3 years",
  "capacity": 5
}
Assert roomB.id != null

ExpectFail Call ../../utils/room/ROOM-UTIL-001-create-room.bnrest.md With Json Into reattempt
{
  "accessToken": "${session.accessToken}",
  "branchSlug": "${branchA.slug}",
  "name": "QA-AUTOTEST-CrossBranch-${roomSuffix}",
  "ageRange": "2-3 years",
  "capacity": 5
}

Teardown
Delete /api/v1/admin/rooms/${roomA.id} Using session.accessToken
Delete /api/v1/admin/rooms/${roomB.id} Using session.accessToken
Call ../../utils/branch/BRANCH-FIX-002-archive-test-branch.bnrest.md With Json Into cleanupA
{
  "accessToken": "${session.accessToken}",
  "slug": "${branchA.slug}"
}
Call ../../utils/branch/BRANCH-FIX-002-archive-test-branch.bnrest.md With Json Into cleanupB
{
  "accessToken": "${session.accessToken}",
  "slug": "${branchB.slug}"
}
```
