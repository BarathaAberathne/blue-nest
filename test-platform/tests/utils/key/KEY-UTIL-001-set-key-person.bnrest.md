---
id: KEY-UTIL-001
number: U.11
type: Test Util
title: Set (or clear) a child's key person
owner: QA Platform
mode: Standalone
status: Active
tags:
  - child
  - key-person
fixtureScope: case
timeoutSeconds: 30
---

# Set or clear a child's key person

`PATCH /admin/children/{id}/key-person` (not PUT — confirmed against
`routes.go`), body `{staff_id}`. An empty `staff_id` clears the allocation
(`childService.SetKeyPerson`). Returns the full updated Child (200).

Inputs: `input.accessToken`, `input.childId`, `input.staffId` (pass `""` to
clear).

```bnrest
Patch /api/v1/admin/children/${input.childId}/key-person Into updated Using input.accessToken
{
  "staff_id": "${input.staffId}"
}

AssertStatus updated 200

Output
{
  "id": "${updated.body.data.id}",
  "keyPersonId": "${updated.body.data.key_person_id}",
  "keyPersonName": "${updated.body.data.key_person_name}"
}
```
