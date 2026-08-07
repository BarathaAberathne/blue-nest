---
id: SHIFTS-TC-003
number: 2.2.3
type: Test Case
title: A shift's times can be updated, and deleting it removes it from the weekly list
owner: QA
mode: Standalone
status: Active
tags:
  - shifts
dependsOn: []
uses: []
fixtureScope: case
timeoutSeconds: 30
---

# Update and delete a shift

New coverage (`SUI-SHIFTS-001`). Reads the shared `adminSession`/`branch`/
`staff` suite fixtures — see `SUI-SHIFTS-001`.

```bnrest
Given Post /api/v1/admin/shifts Into shift Using adminSession.accessToken
{
  "staff_id": "${staff.id}",
  "branch_slug": "${branch.slug}",
  "date": "${monday("+20w+2d")}",
  "start_time": "09:00",
  "end_time": "17:00"
}
Then AssertStatus shift 201

When Put /api/v1/admin/shifts/${shift.body.data.id} Into updated Using adminSession.accessToken
{
  "staff_id": "${staff.id}",
  "branch_slug": "${branch.slug}",
  "date": "${monday("+20w+2d")}",
  "start_time": "13:00",
  "end_time": "18:00"
}
Then AssertStatus updated 200
And Assert updated.body.data.start_time == "13:00"
And Assert updated.body.data.end_time == "18:00"

When Delete /api/v1/admin/shifts/${shift.body.data.id} Into deleted Using adminSession.accessToken
Then AssertStatus deleted 204

When Get /api/v1/admin/shifts?branch=${branch.slug}&week=${monday("+20w")} Into afterDelete Using adminSession.accessToken
Then AssertStatus afterDelete 200
And AssertJson afterDelete "$.body.data[?(@.id=='${shift.body.data.id}')].length()" == 0
```
