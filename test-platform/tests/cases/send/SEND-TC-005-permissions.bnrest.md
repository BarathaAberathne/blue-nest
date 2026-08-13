---
id: SEND-TC-005
number: 2.32.5
type: Test Case
title: Sensitive SEND data needs send.manage — practitioner 403, SENCO full access
owner: QA
mode: Standalone
status: Active
tags: [send, security, regression]
dependsOn: []
uses: [CHILD-UTIL-003, SEND-FIX-001]
fixtureScope: case
timeoutSeconds: 40
---

# Permission split

A practitioner (children.manage, no send.manage) can see the child record —
including the OPERATIONAL send_status marker — but never the sensitive
profile or the overview. The SENCO role has full SEND access.

```bnrest
Setup
Call ../../utils/child/CHILD-UTIL-003-create-child-direct.bnrest.md With Json Into permChild
{ "accessToken": "${adminSession.accessToken}", "branchSlug": "${branch.slug}", "firstName": "QA-AUTOTEST", "lastName": "Perm-${random()}", "dob": "${today("-30m")}" }

Call ../../utils/send/SEND-FIX-001-record-send-support.bnrest.md With Json Into fixture
{ "accessToken": "${adminSession.accessToken}", "childId": "${permChild.id}", "status": "sen_support", "summary": "Confidential detail" }

Body
# Practitioner: operational tier only.
When Get /api/v1/admin/children/${permChild.id} Into pracChild Using pracSession.accessToken
Then AssertStatus pracChild 200
And Assert pracChild.body.data.send_status == "sen_support"

When Get /api/v1/admin/children/${permChild.id}/send-support Into pracProf Using pracSession.accessToken
Then AssertStatus pracProf 403

When Put /api/v1/admin/children/${permChild.id}/send-support Into pracWrite Using pracSession.accessToken
{ "status": "ehcp", "summary": "", "categories": [], "send_lead_staff_id": "", "plan_status": "", "review_date": "", "start_date": "", "end_date": "" }
Then AssertStatus pracWrite 403

When Get /api/v1/admin/send/overview?branch=${branch.slug} Into pracOv Using pracSession.accessToken
Then AssertStatus pracOv 403

# SENCO: full profile access within their branch.
When Get /api/v1/admin/children/${permChild.id}/send-support Into sencoProf Using sencoSession.accessToken
Then AssertStatus sencoProf 200
And Assert sencoProf.body.data.summary == "Confidential detail"

When Get /api/v1/admin/send/overview?branch=${branch.slug} Into sencoOv Using sencoSession.accessToken
Then AssertStatus sencoOv 200
And AssertJson sencoOv "$.body.data.rows[?(@.child_id=='${permChild.id}')]" == 1

Teardown
Delete /api/v1/admin/children/${permChild.id} Using adminSession.accessToken
```
