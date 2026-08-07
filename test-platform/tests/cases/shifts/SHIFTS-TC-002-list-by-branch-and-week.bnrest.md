---
id: SHIFTS-TC-002
number: 2.2.2
type: Test Case
title: Listing shifts by branch and week returns a just-created shift
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

# List shifts by branch + week

New coverage (`SUI-SHIFTS-001`). `GET /admin/shifts` requires both
`branch` and `week` query params. Reads the shared `adminSession`/
`branch`/`staff` suite fixtures — see `SUI-SHIFTS-001`.

```bnrest
Given Post /api/v1/admin/shifts Into shift Using adminSession.accessToken
{
  "staff_id": "${staff.id}",
  "branch_slug": "${branch.slug}",
  "date": "${monday("+20w+1d")}",
  "start_time": "09:00",
  "end_time": "17:00"
}
Then AssertStatus shift 201

When Get /api/v1/admin/shifts?branch=${branch.slug}&week=${monday("+20w")} Into list Using adminSession.accessToken
Then AssertStatus list 200
And AssertJson list "$.body.data[?(@.id=='${shift.body.data.id}')].length()" == 1

When Get /api/v1/admin/shifts Into missingParams Using adminSession.accessToken
Then AssertStatus missingParams 400

Teardown
Delete /api/v1/admin/shifts/${shift.body.data.id} Using adminSession.accessToken
```
