---
id: ROLE-TC-003
number: 1.4.9
type: Test Case
title: A Deputy Manager CAN view Harrow enquiries, update status, and add notes
owner: QA
mode: Standalone
status: Active
tags:
  - role
  - golden-path
dependsOn: []
uses: []
fixtureScope: case
timeoutSeconds: 30
---

# Deputy Manager CAN operate on enquiries

Replaces legacy `RoleSuite.tc_role_002_deputyCanOperateOnEnquiries`. Reads
the shared `deputySession` and `enquiry` suite fixtures — see `ROLE-TC-001`.

```bnrest
Given Get /api/v1/admin/enquiries?branch=${branch.slug} Into list Using deputySession.accessToken
Then AssertStatus list 200

When Patch /api/v1/admin/enquiries/${enquiry.body.data.id}/status Into statusChange Using deputySession.accessToken
{
  "status": "contacted"
}
Then AssertStatus statusChange 200

When Post /api/v1/admin/enquiries/${enquiry.body.data.id}/notes Into noteAdded Using deputySession.accessToken
{
  "note": "QA-AUTOTEST — deputy permission check"
}
Then AssertStatus noteAdded 200
```
