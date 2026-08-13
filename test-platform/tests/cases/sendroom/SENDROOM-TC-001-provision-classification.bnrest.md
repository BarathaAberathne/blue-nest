---
id: SENDROOM-TC-001
number: 2.33.1
type: Test Case
title: Room provision classifies the room only — a non-SEND child is NOT blocked from a SEND-dedicated room
owner: QA
mode: Standalone
status: Active
tags: [send, regression]
dependsOn: []
uses: [SENDROOM-FIX-001, CHILDROOM-UTIL-001]
fixtureScope: case
timeoutSeconds: 40
---

# Provision classification

The dedicated room is a normal Room with a label; validation must not invent
a business rule the nursery doesn't have — allocation is management judgement
(the UI shows a notice, the API never blocks on provision).

```bnrest
Body
When Get /api/v1/admin/rooms/${sendRoom.id} Into room Using adminSession.accessToken
Then AssertStatus room 200
And Assert room.body.data.provision == "send_dedicated"

# Provision is editable back to mainstream and re-set (audit-covered room update).
When Put /api/v1/admin/rooms/${sendRoom.id} Into toMain Using adminSession.accessToken
{ "branch_slug": "${branch.slug}", "name": "${sendRoom.name}", "age_range": "2-5 years", "capacity": 6, "provision": "" }
Then AssertStatus toMain 200
And AssertJson toMain "$.body[?(@.data && !@.data.provision)]" == 1

When Put /api/v1/admin/rooms/${sendRoom.id} Into backToSend Using adminSession.accessToken
{ "branch_slug": "${branch.slug}", "name": "${sendRoom.name}", "age_range": "2-5 years", "capacity": 6, "provision": "send_dedicated" }
Then AssertStatus backToSend 200
And Assert backToSend.body.data.provision == "send_dedicated"

# An unknown provision label is rejected.
When Put /api/v1/admin/rooms/${sendRoom.id} Into badProv Using adminSession.accessToken
{ "branch_slug": "${branch.slug}", "name": "${sendRoom.name}", "age_range": "2-5 years", "capacity": 6, "provision": "specialist" }
Then AssertStatus badProv 400

# A NON-SEND child allocates into the SEND-dedicated room without any block.
Call ../../utils/childroom/CHILDROOM-UTIL-001-allocate-child.bnrest.md With Json Into plainPlaced
{ "accessToken": "${adminSession.accessToken}", "childId": "${plainChild.id}", "roomId": "${sendRoom.id}", "overrideReason": "" }
Then Assert plainPlaced.status == "active"

Teardown
Patch /api/v1/admin/child-room-assignments/${plainPlaced.id} Using adminSession.accessToken
{ "end": true }
```
