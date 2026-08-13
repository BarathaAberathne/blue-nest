---
id: SENDROOM-FIX-001
number: U.18
type: Test Util
title: Create a SEND-dedicated room
owner: QA Platform
mode: Standalone
status: Active
tags:
  - send
  - fixture
fixtureScope: case
timeoutSeconds: 30
---

# Create a SEND-dedicated room

Creates a room with `provision: send_dedicated` through the NORMAL room
endpoint — a SEND room is a normal Room with a classification, not a second
room system. Mainstream rooms keep using ROOM-UTIL-001 unchanged.

Inputs: `input.accessToken`, `input.branchSlug`, `input.name`,
`input.capacity`.

```bnrest
Post /api/v1/admin/rooms Into created Using input.accessToken
{
  "branch_slug": "${input.branchSlug}",
  "name": "${input.name}",
  "age_range": "2-5 years",
  "capacity": ${input.capacity},
  "provision": "send_dedicated"
}

AssertStatus created 201
Assert created.body.data.provision == "send_dedicated"

Output
{
  "id": "${created.body.data.id}",
  "name": "${created.body.data.name}",
  "provision": "${created.body.data.provision}"
}
```
