---
id: SEND-FIX-001
number: U.17
type: Test Util
title: Record SEND/additional-support status for a child
owner: QA Platform
mode: Standalone
status: Active
tags:
  - send
  - fixture
fixtureScope: case
timeoutSeconds: 30
---

# Record SEND support for a child

The one authoritative SEND-profile write (`PUT /admin/children/{id}/send-support`).
SEND tests use this with a NORMAL child created by CHILD-UTIL-003 — a SEND
child stays the same canonical Child record.

Inputs: `input.accessToken`, `input.childId`, `input.status`
(monitoring|sen_support|ehcp|ended), `input.summary` (optional).

```bnrest
Put /api/v1/admin/children/${input.childId}/send-support Into created Using input.accessToken
{
  "status": "${input.status}",
  "summary": "${input.summary}",
  "categories": [],
  "send_lead_staff_id": "",
  "plan_status": "",
  "review_date": "",
  "start_date": "",
  "end_date": ""
}

AssertStatus created 200
Assert created.body.data.child_id != null

Output
{
  "id": "${created.body.data.id}",
  "childId": "${created.body.data.child_id}",
  "status": "${created.body.data.status}"
}
```
