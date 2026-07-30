---
id: CHILD-UTIL-003
number: U.10
type: Test Util
title: Create a child directly (not via enquiry registration)
owner: QA Platform
mode: Standalone
status: Active
tags:
  - child
fixtureScope: case
timeoutSeconds: 30
---

# Create a child directly

`POST /admin/children` only strictly requires `first_name`, `last_name`,
`branch_slug` (`models.ChildRequest`/`childService.Create`) — this is the
direct-create path, distinct from `CHILD-UTIL-001`'s enquiry-registration
path. Used as a plain fixture by the Key Person suite, which doesn't care
how the child came to exist.

Inputs: `input.accessToken`, `input.branchSlug`, `input.firstName`,
`input.lastName`, `input.dob`.

```bnrest
Post /api/v1/admin/children Into created Using input.accessToken
{
  "first_name": "${input.firstName}",
  "last_name": "${input.lastName}",
  "dob": "${input.dob}",
  "branch_slug": "${input.branchSlug}"
}

AssertStatus created 201
Assert created.body.data.id != null

Output
{
  "id": "${created.body.data.id}",
  "ref": "${created.body.data.ref}",
  "firstName": "${created.body.data.first_name}",
  "lastName": "${created.body.data.last_name}",
  "branchSlug": "${input.branchSlug}"
}
```
