---
id: ROOM-TC-003
number: 1.3.3
type: Test Case
title: Room capacity of zero is rejected
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
fixtureScope: case
timeoutSeconds: 30
---

# Zero capacity is rejected

Replaces legacy `RoomSuite.tc_room_002_zeroCapacityRejected` — a
regression lock for a real defect (rooms with `capacity <= 0` were
silently accepted before a backend fix). Calls the raw endpoint directly
(not `ROOM-UTIL-001`, which asserts success) so the specific error message
can be inspected — see `writing-tests.md`'s "negative API test" pattern.
Runs against its own throwaway branch (`BRANCH-FIX-001`), not the real
Harrow branch — the invariant under test doesn't depend on which branch.

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

Body
When Post /api/v1/admin/rooms Into rejected Using session.accessToken
{
  "branch_slug": "${branch.slug}",
  "name": "QA-AUTOTEST-ZeroCap-${random()}",
  "age_range": "1-2 years",
  "capacity": 0
}
Then AssertStatus rejected 400
And AssertJson rejected $.body.error contains "positive"

Teardown
Call ../../utils/branch/BRANCH-FIX-002-archive-test-branch.bnrest.md With Json Into cleanup
{
  "accessToken": "${session.accessToken}",
  "slug": "${branch.slug}"
}
```
