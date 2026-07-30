---
id: AUDIT-TC-001
number: 2.3.1
type: Test Case
title: Creating a room writes a matching create/room audit-log entry
owner: QA
mode: Standalone
status: Active
tags:
  - audit
  - golden-path
dependsOn: []
uses: []
fixtureScope: case
timeoutSeconds: 30
---

# Room create is audit-logged

New coverage (`SUI-AUDIT-001`, no legacy equivalent). Verified against
`internal/models/audit_log.go` and the `action="create"`/
`entity_type="room"` constants written by the room admin handler. Reads
the shared `adminSession`/`branch` suite fixtures — see `SUI-AUDIT-001`.

```bnrest
Given Post /api/v1/admin/rooms Into room Using adminSession.accessToken
{
  "branch_slug": "${branch.slug}",
  "name": "QA-AUTOTEST-AuditRoom-${random()}",
  "age_range": "2-5 years",
  "capacity": 5
}
Then AssertStatus room 201

When Get /api/v1/admin/audit-logs?entity_type=room&action=create Into logs Using adminSession.accessToken
Then AssertStatus logs 200
And AssertJson logs "$.body.data[?(@.entity_id=='${room.body.data.id}')].length()" == 1

Teardown
Delete /api/v1/admin/rooms/${room.body.data.id} Using adminSession.accessToken
```
