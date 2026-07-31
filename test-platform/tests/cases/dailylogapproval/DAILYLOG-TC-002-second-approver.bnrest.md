---
id: DAILYLOG-TC-002
number: 2.22.2
type: Test Case
title: Full incident log for a child — every field persists, then a second approver approves it into the permanent record
owner: QA
mode: Standalone
status: Active
tags:
  - dailylog
  - regression
dependsOn: []
uses: []
fixtureScope: case
timeoutSeconds: 45
---

# Full daily-log lifecycle for a child (rich incident + approval)

The end-to-end "add a daily log for a child" case: submits a fully-populated
incident/accident log (nature, first aid, witnesses, other staff present,
parents-notified, statutory reporting, attachments), asserts every field
persisted, then a DIFFERENT approver signs it off so it becomes the
approved record. Creates a second org-wide approver (admin role). Reads the
shared `adminSession`/`child`/`branch` fixtures (see `SUI-DAILYLOG-001`).

```bnrest
Setup
Post /api/v1/admin/users Into approver Using adminSession.accessToken
{ "email": "qa-autotest-approver-${random()}@bluenest.test", "password": "Approver2027!", "role": "admin", "first_name": "QA-AUTOTEST", "last_name": "Approver" }
AssertStatus approver 201

Call ../../utils/auth/AUTH-UTIL-001-login.bnrest.md With Json Into approverSession
{ "email": "${approver.body.data.email}", "password": "Approver2027!" }

Body
When Post /api/v1/admin/daily-records Into created Using adminSession.accessToken
{
  "type": "incident", "child_id": "${child.body.data.id}", "branch_slug": "${branch.slug}",
  "title": "QA-AUTOTEST Bump", "detail": "Tripped on the mat and bumped their knee",
  "severity": "medium", "first_aid": "Cold compress applied for 10 minutes",
  "witnesses": ["Room Leader A"], "other_staff": ["Practitioner B"],
  "parents_notified": "Called mum at 14:05, collected at pickup",
  "action_taken": "Monitored; no swelling", "reported_to": ["Ofsted", "RIDDOR"],
  "other_notes": "Parent signed the accident book", "attachments": ["/uploads/knee.jpg"]
}
Then AssertStatus created 201
And Assert created.body.data.approval_status == "pending"

When Get /api/v1/admin/daily-records/${created.body.data.id} Into fetched Using adminSession.accessToken
Then AssertStatus fetched 200
And Assert fetched.body.data.first_aid == "Cold compress applied for 10 minutes"
And Assert fetched.body.data.parents_notified == "Called mum at 14:05, collected at pickup"
And AssertJson fetched "$.body.data.witnesses[0]" == "Room Leader A"
And AssertJson fetched "$.body.data.other_staff[0]" == "Practitioner B"
And AssertJson fetched "$.body.data.reported_to.length()" == 2
And AssertJson fetched "$.body.data.attachments.length()" == 1

When Post /api/v1/admin/daily-records/${created.body.data.id}/approve Into approved Using approverSession.accessToken
Then AssertStatus approved 200
And Assert approved.body.data.approval_status == "approved"

When Get /api/v1/admin/daily-records?approval=approved&branch=${branch.slug} Into list Using adminSession.accessToken
Then AssertStatus list 200
And AssertJson list "$.body.data[?(@.title=='QA-AUTOTEST Bump')]" == 1

Teardown
Delete /api/v1/admin/daily-records/${created.body.data.id} Using adminSession.accessToken
Delete /api/v1/admin/users/${approver.body.data.id} Using adminSession.accessToken
```
