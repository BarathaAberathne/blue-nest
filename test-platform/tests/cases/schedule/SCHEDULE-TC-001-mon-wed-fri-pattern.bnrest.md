---
id: SCHEDULE-TC-001
number: 1.12.1
type: Test Case
title: A Mon/Wed/Fri full-day schedule persists and is reflected in the room's capacity forecast, not Tue/Thu
owner: QA
mode: Standalone
status: Active
tags:
  - schedule
  - golden-path
dependsOn: []
uses: []
fixtureScope: case
timeoutSeconds: 30
---

# Mon/Wed/Fri schedule reflected in capacity forecast

Replaces legacy `ScheduleSuite.tc_schedule_001_mondayWednesdayFridayPattern`.
Reads the shared `adminSession`/`branch`/`room`/`child` suite fixtures —
see `SUI-KPI-001`.

```bnrest
Given Put /api/v1/admin/children/${child.id} Into updated Using adminSession.accessToken
{
  "branch_slug": "${branch.slug}",
  "room_id": "${room.id}",
  "sessions": [
    {"day": "Mon", "type": "full"},
    {"day": "Wed", "type": "full"},
    {"day": "Fri", "type": "full"}
  ]
}
Then AssertStatus updated 200
And AssertJson updated $.body.data.sessions.length() > 0

When Get /api/v1/admin/children/capacity-forecast?branch=${branch.slug}&weeks=1 Into forecast Using adminSession.accessToken
Then AssertStatus forecast 200

CopyJson forecast "$.body.data.rooms[?(@.room_id=='${room.id}')]" Into myRoom
CopyJson myRoom "$.weeks[0].days[?(@.day=='Mon')]" Into mon
Then Assert mon.am_children == 1
And Assert mon.pm_children == 1

CopyJson myRoom "$.weeks[0].days[?(@.day=='Tue')]" Into tue
Then Assert tue.am_children == 0
And Assert tue.pm_children == 0
```
