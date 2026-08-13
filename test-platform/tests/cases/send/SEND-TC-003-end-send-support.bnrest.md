---
id: SEND-TC-003
number: 2.32.3
type: Test Case
title: Ending SEND support keeps the profile (history) but the child no longer classifies as SEND
owner: QA
mode: Standalone
status: Active
tags: [send, regression]
dependsOn: [SEND-TC-002]
uses: []
fixtureScope: case
timeoutSeconds: 30
---

# End support

```bnrest
Body
When Put /api/v1/admin/children/${child.id}/send-support Into ended Using adminSession.accessToken
{ "status": "ended", "summary": "Support concluded", "categories": [], "send_lead_staff_id": "", "plan_status": "ended", "review_date": "", "start_date": "", "end_date": "${today()}" }
Then AssertStatus ended 200
And Assert ended.body.data.status == "ended"

# Child marker follows; "ended" is NOT an active SEND status, so the child
# drops out of the SEND overview.
When Get /api/v1/admin/children/${child.id} Into rec Using adminSession.accessToken
Then Assert rec.body.data.send_status == "ended"

When Get /api/v1/admin/send/overview?branch=${branch.slug} Into ov Using adminSession.accessToken
Then AssertStatus ov 200
And AssertJson ov "$.body.data.rows[?(@.child_id=='${child.id}')]" == 0

# The profile itself is retained for history.
When Get /api/v1/admin/children/${child.id}/send-support Into kept Using adminSession.accessToken
Then AssertStatus kept 200
And Assert kept.body.data.status == "ended"
```
