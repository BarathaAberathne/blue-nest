---
id: DAILYLOG-TC-003
number: 2.22.3
type: Test Case
title: Approval notifications reach the right person — approver on submit, author on approve
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

# Approval notifications route to the correct person

When a log is submitted the approvers are notified; when it is approved the
author is notified. Creates a second org-wide approver (admin) and checks
each side's own notifications. Reads the shared `adminSession`/`child`/
`branch` fixtures (see `SUI-DAILYLOG-001`).

```bnrest
Setup
Post /api/v1/admin/users Into approver Using adminSession.accessToken
{ "email": "qa-autotest-notif-${random()}@bluenest.test", "password": "Approver2027!", "role": "admin", "first_name": "QA-AUTOTEST", "last_name": "Notif" }
AssertStatus approver 201

Call ../../utils/auth/AUTH-UTIL-001-login.bnrest.md With Json Into approverSession
{ "email": "${approver.body.data.email}", "password": "Approver2027!" }

Body
When Post /api/v1/admin/daily-records Into created Using adminSession.accessToken
{ "type": "observation", "child_id": "${child.body.data.id}", "branch_slug": "${branch.slug}", "title": "QA-AUTOTEST Notif" }
Then AssertStatus created 201

When Get /api/v1/admin/notifications Into approverNotifs Using approverSession.accessToken
Then AssertStatus approverNotifs 200
And AssertJson approverNotifs "$.body.data.items[?(@.entity_id=='${created.body.data.id}')]" == 1

When Post /api/v1/admin/daily-records/${created.body.data.id}/approve Into approved Using approverSession.accessToken
Then AssertStatus approved 200

When Get /api/v1/admin/notifications Into authorNotifs Using adminSession.accessToken
Then AssertStatus authorNotifs 200
And AssertJson authorNotifs "$.body.data.items[?(@.entity_id=='${created.body.data.id}' && @.type=='daily_log_approved')]" == 1

Teardown
Delete /api/v1/admin/daily-records/${created.body.data.id} Using adminSession.accessToken
Delete /api/v1/admin/users/${approver.body.data.id} Using adminSession.accessToken
```
