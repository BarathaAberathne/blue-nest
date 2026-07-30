---
id: AUDIT-TC-003
number: 2.3.3
type: Test Case
title: The limit query param caps the number of audit-log entries returned
owner: QA
mode: Standalone
status: Active
tags:
  - audit
dependsOn: []
uses: []
fixtureScope: case
timeoutSeconds: 30
---

# Limit param caps results

New coverage (`SUI-AUDIT-001`). Creates 3 rooms (3 audit entries) then
asserts a `limit=2` request returns at most 2, sorted newest-first. Reads
the shared `adminSession`/`branch` suite fixtures — see `SUI-AUDIT-001`.

```bnrest
Setup
Post /api/v1/admin/rooms Into r1 Using adminSession.accessToken
{"branch_slug": "${branch.slug}", "name": "QA-AUTOTEST-Limit1-${random()}", "age_range": "2-5 years", "capacity": 5}
AssertStatus r1 201

Post /api/v1/admin/rooms Into r2 Using adminSession.accessToken
{"branch_slug": "${branch.slug}", "name": "QA-AUTOTEST-Limit2-${random()}", "age_range": "2-5 years", "capacity": 5}
AssertStatus r2 201

Post /api/v1/admin/rooms Into r3 Using adminSession.accessToken
{"branch_slug": "${branch.slug}", "name": "QA-AUTOTEST-Limit3-${random()}", "age_range": "2-5 years", "capacity": 5}
AssertStatus r3 201

Body
When Get /api/v1/admin/audit-logs?entity_type=room&action=create&limit=2 Into logs Using adminSession.accessToken
Then AssertStatus logs 200
And AssertJson logs "$.body.data.length()" <= 2

Teardown
Delete /api/v1/admin/rooms/${r1.body.data.id} Using adminSession.accessToken
Delete /api/v1/admin/rooms/${r2.body.data.id} Using adminSession.accessToken
Delete /api/v1/admin/rooms/${r3.body.data.id} Using adminSession.accessToken
```
