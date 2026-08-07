---
id: SHIFTS-TC-005
number: 2.2.5
type: Test Case
title: An external cover shift (free-text visitor, no staff record) can be rostered
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

# External cover shift

New coverage (`SUI-SHIFTS-001`). Per `CLAUDE.md`'s "Add cover" feature —
an external visitor has no staff record, so `staff_name`/`branch_slug` are
supplied directly instead of a `staff_id`. Reads the shared `adminSession`/
`branch` suite fixtures — see `SUI-SHIFTS-001`.

```bnrest
Given Post /api/v1/admin/shifts Into cover Using adminSession.accessToken
{
  "external": true,
  "staff_name": "QA-AUTOTEST External Cover",
  "branch_slug": "${branch.slug}",
  "date": "${monday("+20w+4d")}",
  "start_time": "09:00",
  "end_time": "17:00"
}
Then AssertStatus cover 201
And Assert cover.body.data.external == true
And Assert cover.body.data.staff_name == "QA-AUTOTEST External Cover"

Teardown
Delete /api/v1/admin/shifts/${cover.body.data.id} Using adminSession.accessToken
```
