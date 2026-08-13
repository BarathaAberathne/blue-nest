---
id: SENDROOM-TC-002
number: 2.33.2
type: Test Case
title: A SEND child allocates to a MAINSTREAM room via the normal assignment — roster, capacity and overview all agree
owner: QA
mode: Standalone
status: Active
tags: [send, regression]
dependsOn: [SENDROOM-TC-001]
uses: [CHILDROOM-UTIL-001]
fixtureScope: case
timeoutSeconds: 40
---

# SEND child + mainstream room

```bnrest
Body
Call ../../utils/childroom/CHILDROOM-UTIL-001-allocate-child.bnrest.md With Json Into placed
{ "accessToken": "${adminSession.accessToken}", "childId": "${sendChild.id}", "roomId": "${mainstream.id}", "overrideReason": "" }
Then Assert placed.status == "active"

# Room roster contains the child; SEND counts toward NORMAL capacity.
When Get /api/v1/admin/rooms/${mainstream.id}/capacity Into cap Using adminSession.accessToken
Then AssertStatus cap 200
And Assert cap.body.data.allocated_children == 1
And Assert cap.body.data.send_children == 1
And Assert cap.body.data.available_spaces == 7

# The SEND overview shows the child with mainstream provision.
When Get /api/v1/admin/send/overview?branch=${branch.slug} Into ov Using adminSession.accessToken
Then AssertStatus ov 200
And AssertJson ov "$.body.data.rows[?(@.child_id=='${sendChild.id}' && @.provision=='mainstream')]" == 1
And Assert ov.body.data.in_mainstream == 1
And Assert ov.body.data.in_specialist == 0
```
