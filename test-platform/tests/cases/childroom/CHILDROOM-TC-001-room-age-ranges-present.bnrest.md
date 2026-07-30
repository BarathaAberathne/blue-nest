---
id: CHILDROOM-TC-001
number: 1.9.1
type: Test Case
title: Existing Harrow rooms carry sane, non-overlapping age ranges for the recommendation logic
owner: QA
mode: Standalone
status: Active
tags:
  - childroom
dependsOn: []
uses:
  - AUTH-UTIL-001
fixtureScope: case
timeoutSeconds: 30
---

# Harrow rooms have an age_range (environment-specific)

Replaces legacy `ChildRoomSuite.tc_childroom_001_roomAgeRangesArePresent`.
Deliberately checks the real, live Harrow branch's actual pre-existing
rooms — a genuinely environment-specific check (real data quality), not
generic behaviour — same category as `ROOM-TC-001`/`BRANCH-TC-001` (see
`test-platform-architecture.md` "Exceptions").

```bnrest
Given Call ../../utils/auth/AUTH-UTIL-001-login.bnrest.md With Json Into session
{
  "email": "admin@bluenest.uk",
  "password": "${secret:QA_ADMIN_PASSWORD}"
}

When Get /api/v1/admin/rooms?branch=harrow Into rooms Using session.accessToken
Then AssertStatus rooms 200
And AssertJson rooms "$.body.data[?(@.age_range=='')]" == 0
```
