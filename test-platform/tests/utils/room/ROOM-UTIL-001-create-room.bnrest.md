---
id: ROOM-UTIL-001
number: U.3
type: Test Util
title: Create a room
owner: QA Platform
mode: Standalone
status: Active
tags:
  - room
fixtureScope: case
timeoutSeconds: 30
---

# Create a room

The one authoritative room-creation implementation — every Room test that
needs to create a room (valid or invalid) calls this instead of duplicating
the `POST /admin/rooms` body. Negative tests wrap the `Call` in
`ExpectFail` (see `writing-tests.md`) rather than re-implementing the
request.

Inputs: `input.accessToken`, `input.branchSlug`, `input.name`,
`input.ageRange`, `input.capacity`.

```bnrest
Post /api/v1/admin/rooms Into created Using input.accessToken
{
  "branch_slug": "${input.branchSlug}",
  "name": "${input.name}",
  "age_range": "${input.ageRange}",
  "capacity": ${input.capacity}
}

AssertStatus created 201
Assert created.body.data.id != null

Output
{
  "id": "${created.body.data.id}",
  "name": "${created.body.data.name}",
  "capacity": ${created.body.data.capacity}
}
```
