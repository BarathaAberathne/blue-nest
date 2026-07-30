---
id: CHILD-UTIL-002
number: U.9
type: Test Util
title: Get a child by id
owner: QA Platform
mode: Standalone
status: Active
tags:
  - child
fixtureScope: case
timeoutSeconds: 30
---

# Get a child by id

Thin wrapper over `GET /admin/children/{id}` — the shared "read back a
child" helper for Key Person tests that need to assert the resolved
`key_person_id`/`key_person_name` after an allocation.

Inputs: `input.accessToken`, `input.childId`.

```bnrest
Get /api/v1/admin/children/${input.childId} Into fetched Using input.accessToken
AssertStatus fetched 200

Output
{
  "id": "${fetched.body.data.id}",
  "firstName": "${fetched.body.data.first_name}",
  "lastName": "${fetched.body.data.last_name}",
  "branchSlug": "${fetched.body.data.branch_slug}",
  "status": "${fetched.body.data.status}",
  "keyPersonId": "${fetched.body.data.key_person_id}"
}
```
