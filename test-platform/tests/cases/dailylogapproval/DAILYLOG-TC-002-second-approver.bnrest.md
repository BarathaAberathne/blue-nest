---
id: DAILYLOG-TC-002
number: 2.22.2
type: Test Case
title: A different approver can approve a submitted log, making it the permanent (approved) record
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

# Four-eyes: a second approver approves

Creates a second org-wide approver (admin role), who approves a log the
super-admin submitted. Reads the shared `adminSession`/`child`/`branch`
fixtures (see `SUI-DAILYLOG-001`).

```bnrest
Setup
Post /api/v1/admin/users Into approver Using adminSession.accessToken
{ "email": "qa-autotest-approver-${random()}@bluenest.test", "password": "Approver2027!", "role": "admin", "first_name": "QA-AUTOTEST", "last_name": "Approver" }
AssertStatus approver 201

Call ../../utils/auth/AUTH-UTIL-001-login.bnrest.md With Json Into approverSession
{ "email": "${approver.body.data.email}", "password": "Approver2027!" }

Body
When Post /api/v1/admin/daily-records Into created Using adminSession.accessToken
{ "type": "incident", "child_id": "${child.body.data.id}", "branch_slug": "${branch.slug}", "title": "QA-AUTOTEST Bump", "detail": "Bumped knee", "severity": "low", "action_taken": "Cold compress" }
Then AssertStatus created 201
And Assert created.body.data.approval_status == "pending"

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
