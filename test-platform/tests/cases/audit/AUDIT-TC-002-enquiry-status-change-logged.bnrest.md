---
id: AUDIT-TC-002
number: 2.3.2
type: Test Case
title: An enquiry status change writes an update_status/enquiry audit-log entry, findable by actor
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

# Enquiry status change is audit-logged, filterable by actor

New coverage (`SUI-AUDIT-001`). Verified against the
`action="update_status"`/`entity_type="enquiry"` constants written by
`handler/admin/enquiries.go`. Also proves the `actor` query filter works
(matches the admin's own email). Reads the shared `adminSession`/`branch`
suite fixtures — see `SUI-AUDIT-001`.

```bnrest
Given Post /api/v1/admin/enquiries Into enquiry Using adminSession.accessToken
{
  "name": "QA-AUTOTEST-AuditEnquiry-${random()}",
  "email": "qa-autotest-auditenquiry-${random()}@bluenest.test",
  "branch": "${branch.slug}",
  "enquiry_type": "General enquiry"
}
Then AssertStatus enquiry 201

When Patch /api/v1/admin/enquiries/${enquiry.body.data.id}/status Into statusChange Using adminSession.accessToken
{
  "status": "contacted"
}
Then AssertStatus statusChange 200

When Get /api/v1/admin/audit-logs?entity_type=enquiry&action=update_status&actor=admin@bluenest.uk Into logs Using adminSession.accessToken
Then AssertStatus logs 200
And AssertJson logs "$.body.data[?(@.entity_id=='${enquiry.body.data.id}')].length()" == 1
```
