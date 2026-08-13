---
id: SENDROOM-TC-003
number: 2.33.3
type: Test Case
title: Transfer mainstream → SEND-dedicated uses the normal transfer, keeps history and the SEND profile
owner: QA
mode: Standalone
status: Active
tags: [send, regression]
dependsOn: [SENDROOM-TC-002]
uses: []
fixtureScope: case
timeoutSeconds: 40
---

# Transfer into specialist provision

```bnrest
Body
When Post /api/v1/admin/children/${sendChild.id}/transfer-room Into moved Using adminSession.accessToken
{ "room_id": "${sendRoom.id}", "reason": "specialist provision agreed with parents" }
Then AssertStatus moved 200
And AssertJson moved "$.body.data.room_id" == "${sendRoom.id}"
And Assert moved.body.data.status == "active"

# History: the mainstream placement ended, exactly one active assignment.
When Get /api/v1/admin/children/${sendChild.id}/room-assignments Into hist Using adminSession.accessToken
Then AssertStatus hist 200
And AssertJson hist "$.body.data[?(@.status=='active')].length()" == 1
And AssertJson hist "$.body.data[?(@.room_id=='${mainstream.id}' && @.status=='ended')].length()" == 1

# Both capacities updated.
When Get /api/v1/admin/rooms/${mainstream.id}/capacity Into capMain Using adminSession.accessToken
Then Assert capMain.body.data.allocated_children == 0
And Assert capMain.body.data.send_children == 0

When Get /api/v1/admin/rooms/${sendRoom.id}/capacity Into capSend Using adminSession.accessToken
Then Assert capSend.body.data.allocated_children == 1
And Assert capSend.body.data.send_children == 1

# The SEND profile survived the transfer completely unchanged.
When Get /api/v1/admin/children/${sendChild.id}/send-support Into prof Using adminSession.accessToken
Then AssertStatus prof 200
And Assert prof.body.data.status == "sen_support"
And Assert prof.body.data.summary == "Allocation suite fixture"

# Overview now reports specialist provision.
When Get /api/v1/admin/send/overview?branch=${branch.slug} Into ov Using adminSession.accessToken
Then AssertJson ov "$.body.data.rows[?(@.child_id=='${sendChild.id}' && @.provision=='send_dedicated')]" == 1
And Assert ov.body.data.in_specialist == 1
And Assert ov.body.data.in_mainstream == 0
```
