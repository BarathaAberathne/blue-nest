---
id: ROOM-TC-001
number: 1.3.1
type: Test Case
title: Harrow's existing (non-test-debris) rooms have valid capacity
owner: QA
mode: Standalone
status: Active
tags:
  - room
  - golden-path
dependsOn: []
uses:
  - AUTH-UTIL-001
fixtureScope: case
timeoutSeconds: 30
---

# Existing rooms have valid (positive) capacity

Replaces legacy `RoomSuite.tc_room_001_existingRoomsAreValid`. The legacy
version loops in Java over every room, skipping two known pieces of
pre-existing debris (`Zero Cap Test`/`Neg Cap Test`, capacity 0/-5,
deliberately preserved as bug evidence from a real defect a manual QA
pass found and fixed — see the legacy suite's own class Javadoc).
There is no loop/foreach command in bnrest (spec §5's closed command set),
so the equivalent invariant is expressed as a single JSONPath filter
instead: **zero** rooms (other than that known debris) have non-positive
capacity.

```bnrest
Given Call ../../utils/auth/AUTH-UTIL-001-login.bnrest.md With Json Into session
{
  "email": "admin@bluenest.uk",
  "password": "${secret:QA_ADMIN_PASSWORD}"
}

When Get /api/v1/admin/rooms?branch=harrow Into rooms Using session.accessToken
Then AssertStatus rooms 200
And AssertJson rooms $.body.data.length() > 0
And AssertJson rooms "$.body.data[?(@.capacity <= 0 && @.name != 'Zero Cap Test' && @.name != 'Neg Cap Test')]" == 0
```
