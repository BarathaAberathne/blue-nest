---
id: SENDROOM-TC-004
number: 2.33.4
type: Test Case
title: Transfer SEND room → mainstream; KPI counts reconcile with the underlying child records at every step
owner: QA
mode: Standalone
status: Active
tags: [send, regression]
dependsOn: [SENDROOM-TC-003]
uses: []
fixtureScope: case
timeoutSeconds: 40
---

# Transfer back + KPI reconciliation

specialist + mainstream + unallocated must always equal total_send, and
dedicated-room + status counts must match the fixtures this suite created.

```bnrest
Body
When Post /api/v1/admin/children/${sendChild.id}/transfer-room Into back Using adminSession.accessToken
{ "room_id": "${mainstream.id}", "reason": "reintegration into mainstream room" }
Then AssertStatus back 200

When Get /api/v1/admin/send/overview?branch=${branch.slug} Into ov Using adminSession.accessToken
Then AssertStatus ov 200
And Assert ov.body.data.total_send == 1
And Assert ov.body.data.sen_support == 1
And Assert ov.body.data.dedicated_rooms == 1
And Assert ov.body.data.in_mainstream == 1
And Assert ov.body.data.in_specialist == 0
And Assert ov.body.data.unallocated == 0

# End the placement (the transfer response IS the active assignment) → the
# child reconciles into "unallocated", total unchanged.
When Patch /api/v1/admin/child-room-assignments/${back.body.data.id} Into endedPlacement Using adminSession.accessToken
{ "end": true }
Then AssertStatus endedPlacement 200

When Get /api/v1/admin/send/overview?branch=${branch.slug} Into ov2 Using adminSession.accessToken
Then Assert ov2.body.data.total_send == 1
And Assert ov2.body.data.unallocated == 1
And Assert ov2.body.data.in_mainstream == 0

# The profile STILL survived every allocation change.
When Get /api/v1/admin/children/${sendChild.id}/send-support Into prof Using adminSession.accessToken
Then Assert prof.body.data.status == "sen_support"
```
