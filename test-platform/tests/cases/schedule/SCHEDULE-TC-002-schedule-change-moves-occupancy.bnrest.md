---
id: SCHEDULE-TC-002
number: 1.12.2
type: Test Case
title: Changing a child's session pattern moves the forecast occupancy from the old day to the new day
owner: QA
mode: Standalone
status: Active
tags:
  - schedule
  - regression
dependsOn: []
uses: []
fixtureScope: case
timeoutSeconds: 30
---

# Schedule change moves occupancy

Replaces legacy `ScheduleSuite.tc_schedule_002_scheduleChangeMovesOccupancy`.
Runs after `SCHEDULE-TC-001` has set Mon/Wed/Fri; moves Fri to Thu and
proves the forecast follows. Reads the shared `adminSession`/`branch`/
`room`/`child` suite fixtures — see `SUI-KPI-001`. Per this platform's own
constraint (case-to-case variables don't leak - see
`docs/testing/test-platform-architecture.md`), this case re-sets the
sessions itself rather than depending on `SCHEDULE-TC-001` having run
first, so it is fully self-contained.

```bnrest
Given Put /api/v1/admin/children/${child.id} Into initial Using adminSession.accessToken
{
  "branch_slug": "${branch.slug}",
  "room_id": "${room.id}",
  "sessions": [
    {"day": "Mon", "type": "full"},
    {"day": "Wed", "type": "full"},
    {"day": "Fri", "type": "full"}
  ]
}
Then AssertStatus initial 200

When Put /api/v1/admin/children/${child.id} Into moved Using adminSession.accessToken
{
  "branch_slug": "${branch.slug}",
  "room_id": "${room.id}",
  "sessions": [
    {"day": "Mon", "type": "full"},
    {"day": "Wed", "type": "full"},
    {"day": "Thu", "type": "full"}
  ]
}
Then AssertStatus moved 200
And AssertJson moved "$.body.data.sessions[?(@.day=='Thu')].length()" == 1
And AssertJson moved "$.body.data.sessions[?(@.day=='Fri')].length()" == 0

When Get /api/v1/admin/children/capacity-forecast?branch=${branch.slug}&weeks=1 Into forecast Using adminSession.accessToken
Then AssertStatus forecast 200

CopyJson forecast "$.body.data.rooms[?(@.room_id=='${room.id}')]" Into myRoom
CopyJson myRoom "$.weeks[0].days[?(@.day=='Thu')]" Into thu
Then Assert thu.am_children == 1

CopyJson myRoom "$.weeks[0].days[?(@.day=='Fri')]" Into fri
Then Assert fri.am_children == 0
```
