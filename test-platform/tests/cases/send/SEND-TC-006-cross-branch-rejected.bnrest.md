---
id: SEND-TC-006
number: 2.32.6
type: Test Case
title: A manager scoped to another branch cannot read or write this branch's SEND data
owner: QA
mode: Standalone
status: Active
tags: [send, security, regression]
dependsOn: []
uses: [CHILD-UTIL-003, SEND-FIX-001]
fixtureScope: case
timeoutSeconds: 40
---

# Cross-branch rejection

The branchB manager holds send.manage — the rejection is pure branch scoping,
proving SEND data never leaks across branches.

```bnrest
Setup
Call ../../utils/child/CHILD-UTIL-003-create-child-direct.bnrest.md With Json Into xbChild
{ "accessToken": "${adminSession.accessToken}", "branchSlug": "${branch.slug}", "firstName": "QA-AUTOTEST", "lastName": "XBranch-${random()}", "dob": "${today("-30m")}" }

Call ../../utils/send/SEND-FIX-001-record-send-support.bnrest.md With Json Into fixture
{ "accessToken": "${adminSession.accessToken}", "childId": "${xbChild.id}", "status": "monitoring", "summary": "Scoped detail" }

Body
When Get /api/v1/admin/children/${xbChild.id}/send-support Into readAttempt Using otherMgrSession.accessToken
Then AssertStatus readAttempt 403

When Put /api/v1/admin/children/${xbChild.id}/send-support Into writeAttempt Using otherMgrSession.accessToken
{ "status": "ehcp", "summary": "", "categories": [], "send_lead_staff_id": "", "plan_status": "", "review_date": "", "start_date": "", "end_date": "" }
Then AssertStatus writeAttempt 403

# The overview pins them to their own branch — this branch's child never appears.
When Get /api/v1/admin/send/overview Into ownOv Using otherMgrSession.accessToken
Then AssertStatus ownOv 200
And AssertJson ownOv "$.body.data.rows[?(@.child_id=='${xbChild.id}')]" == 0

# And requesting the other branch explicitly is rejected outright.
When Get /api/v1/admin/send/overview?branch=${branch.slug} Into forcedOv Using otherMgrSession.accessToken
Then AssertStatus forcedOv 403

Teardown
Delete /api/v1/admin/children/${xbChild.id} Using adminSession.accessToken
```
