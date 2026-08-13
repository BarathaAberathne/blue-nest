---
id: SEND-TC-001
number: 2.32.1
type: Test Case
title: Recording SEND support stores the status on the SAME canonical child and leaves the room assignment untouched
owner: QA
mode: Standalone
status: Active
tags: [send, regression]
dependsOn: []
uses: [SEND-FIX-001, ROOM-UTIL-001, CHILDROOM-UTIL-001]
fixtureScope: case
timeoutSeconds: 40
---

# Record SEND status

The child is allocated to a normal room FIRST; recording SEND support then
stores the profile + the operational `send_status` marker on the same child
record without touching the allocation.

```bnrest
Setup
Call ../../utils/room/ROOM-UTIL-001-create-room.bnrest.md With Json Into room
{ "accessToken": "${adminSession.accessToken}", "branchSlug": "${branch.slug}", "name": "QA-AUTOTEST Mainstream-${random()}", "ageRange": "2-4 years", "capacity": 10 }

Call ../../utils/childroom/CHILDROOM-UTIL-001-allocate-child.bnrest.md With Json Into placed
{ "accessToken": "${adminSession.accessToken}", "childId": "${child.id}", "roomId": "${room.id}", "overrideReason": "" }

Body
# No profile yet — a valid state, not an error.
When Get /api/v1/admin/children/${child.id}/send-support Into before Using adminSession.accessToken
Then AssertStatus before 200
And Assert before.body.data == null

When Put /api/v1/admin/children/${child.id}/send-support Into recorded Using adminSession.accessToken
{ "status": "sen_support", "summary": "1:1 support during transitions", "categories": ["communication_interaction"], "send_lead_staff_id": "", "plan_status": "active", "review_date": "${today("+8w")}", "start_date": "${today()}", "end_date": "" }
Then AssertStatus recorded 200
And Assert recorded.body.data.status == "sen_support"
And AssertJson recorded "$.body.data.child_id" == "${child.id}"

# Same canonical child record, now carrying the operational marker.
When Get /api/v1/admin/children/${child.id} Into rec Using adminSession.accessToken
Then AssertStatus rec 200
And Assert rec.body.data.send_status == "sen_support"
And AssertJson rec "$.body.data.id" == "${child.id}"

# The existing room assignment is completely unchanged.
When Get /api/v1/admin/children/${child.id}/room-assignments Into hist Using adminSession.accessToken
Then AssertStatus hist 200
And AssertJson hist "$.body.data[?(@.id=='${placed.id}' && @.status=='active')]" == 1
```
