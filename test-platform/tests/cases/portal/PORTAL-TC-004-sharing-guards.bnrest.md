---
id: PORTAL-TC-004
number: 2.34.4
type: Test Case
title: Sharing guards — unapproved and safeguarding records cannot be shared; parents cannot reach foreign or staff endpoints
owner: QA
mode: Standalone
status: Active
tags: [portal, security, regression]
dependsOn: []
uses: []
fixtureScope: case
timeoutSeconds: 40
---

# Sharing guards & isolation

```bnrest
Setup
Post /api/v1/admin/daily-records Into pendingLog Using adminSession.accessToken
{ "type": "observation", "child_id": "${child.id}", "branch_slug": "${branch.slug}", "date": "${today()}", "title": "QA-AUTOTEST unapproved", "detail": "x" }
AssertStatus pendingLog 201

Post /api/v1/admin/daily-records Into sgLog Using adminSession.accessToken
{ "type": "safeguarding", "child_id": "${child.id}", "branch_slug": "${branch.slug}", "date": "${today()}", "title": "QA-AUTOTEST safeguarding", "detail": "internal only", "severity": "low" }
AssertStatus sgLog 201

Body
# An unapproved record cannot be shared.
When Post /api/v1/admin/daily-records/${pendingLog.body.data.id}/share Into shareUnapproved Using mgrSession.accessToken
Then AssertStatus shareUnapproved 400

# A safeguarding record can NEVER be shared — even after approval.
When Post /api/v1/admin/daily-records/${sgLog.body.data.id}/approve Into sgApproved Using mgrSession.accessToken
Then AssertStatus sgApproved 200
When Post /api/v1/admin/daily-records/${sgLog.body.data.id}/share Into shareSg Using mgrSession.accessToken
Then AssertStatus shareSg 400

# The parent list stays empty of both, whatever their state.
When Get /api/v1/portal/children/${child.id}/daily-records Into pView Using parentToken
Then AssertStatus pView 200
And AssertJson pView "$.body.data[?(@.type=='safeguarding')]" == 0
And AssertJson pView "$.body.data[?(@.id=='${pendingLog.body.data.id}')]" == 0

# Foreign child daily records → 404; staff daily-record API → denied for parents.
When Get /api/v1/portal/children/${otherChild.id}/daily-records Into foreign Using parentToken
Then AssertStatus foreign 404

When Get /api/v1/admin/daily-records/${sgLog.body.data.id} Into staffApi Using parentToken
Then AssertStatus staffApi 403

Teardown
Delete /api/v1/admin/daily-records/${pendingLog.body.data.id} Using adminSession.accessToken
Delete /api/v1/admin/daily-records/${sgLog.body.data.id} Using adminSession.accessToken
```
