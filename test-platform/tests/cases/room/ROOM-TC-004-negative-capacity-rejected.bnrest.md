---
id: ROOM-TC-004
number: 1.3.4
type: Test Case
title: Negative room capacity is rejected
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

# Negative capacity is rejected

Replaces legacy `RoomSuite.tc_room_002_negativeCapacityRejected`. Runs
against its own throwaway branch — see `ROOM-TC-003`.

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
  "name": "QA-AUTOTEST-NegCap-${random()}",
  "age_range": "1-2 years",
  "capacity": -5
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
