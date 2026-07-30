---
id: ROOM-TC-007
number: 1.3.7
type: Test Case
title: Missing room name is rejected
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
fixtureScope: case
timeoutSeconds: 30
---

# Missing room name is rejected

Replaces legacy `RoomSuite.tc_room_002c_missingNameRejected`. Calls the raw
endpoint directly (not `ROOM-UTIL-001`, which requires a name) since the
whole point is omitting that field. Runs against its own throwaway branch.

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
  "age_range": "1-2 years",
  "capacity": 10
}
Then AssertStatus rejected 400

Teardown
Call ../../utils/branch/BRANCH-FIX-002-archive-test-branch.bnrest.md With Json Into cleanup
{
  "accessToken": "${session.accessToken}",
  "slug": "${branch.slug}"
}
```
