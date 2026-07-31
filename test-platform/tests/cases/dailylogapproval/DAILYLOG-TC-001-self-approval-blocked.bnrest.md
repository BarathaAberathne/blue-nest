---
id: DAILYLOG-TC-001
number: 2.22.1
type: Test Case
title: A submitted log is pending, the author cannot self-approve, and pending logs are hidden from the approved view
owner: QA
mode: Standalone
status: Active
tags:
  - dailylog
  - regression
dependsOn: []
uses: []
fixtureScope: case
timeoutSeconds: 30
---

# Four-eyes: pending + no self-approval

Reads the shared `adminSession`/`child`/`branch` fixtures (see
`SUI-DAILYLOG-001`).

```bnrest
When Post /api/v1/admin/daily-records Into created Using adminSession.accessToken
{ "type": "observation", "child_id": "${child.body.data.id}", "branch_slug": "${branch.slug}", "title": "QA-AUTOTEST Tower", "detail": "Built a tower", "eyfs_areas": ["Physical Development"], "attachments": ["/uploads/x.jpg"] }
Then AssertStatus created 201
And Assert created.body.data.approval_status == "pending"

When Post /api/v1/admin/daily-records/${created.body.data.id}/approve Into selfApprove Using adminSession.accessToken
Then AssertStatus selfApprove 400

When Get /api/v1/admin/daily-records?approval=pending&branch=${branch.slug} Into pending Using adminSession.accessToken
Then AssertStatus pending 200
And AssertJson pending "$.body.data[?(@.title=='QA-AUTOTEST Tower')]" == 1

When Get /api/v1/admin/daily-records?approval=approved&branch=${branch.slug} Into approved Using adminSession.accessToken
Then AssertStatus approved 200
And AssertJson approved "$.body.data[?(@.title=='QA-AUTOTEST Tower')]" == 0

Teardown
Delete /api/v1/admin/daily-records/${created.body.data.id} Using adminSession.accessToken
```
