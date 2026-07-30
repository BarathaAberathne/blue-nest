---
id: USER-TC-001
number: 2.7.1
type: Test Case
title: A super-admin can create a user; a duplicate email and an invalid role are both rejected
owner: QA
mode: Standalone
status: Active
tags:
  - useraccount
  - golden-path
dependsOn: []
uses: []
fixtureScope: case
timeoutSeconds: 30
---

# Create a user, with validation

New coverage (`SUI-USERACCOUNT-001`, no legacy equivalent). Verified
against `internal/handler/admin/users.go`. Reads the shared `adminSession`
suite fixture — see `SUI-USERACCOUNT-001`.

```bnrest
Given Post /api/v1/admin/users Into created Using adminSession.accessToken
{
  "email": "qa-autotest-newuser-${random()}@bluenest.test",
  "password": "NewUser2027!",
  "first_name": "QA-AUTOTEST",
  "last_name": "NewUser",
  "role": "admissions"
}
Then AssertStatus created 201
And Assert created.body.data.role == "admissions"

When Post /api/v1/admin/users Into duplicate Using adminSession.accessToken
{
  "email": "${created.body.data.email}",
  "password": "NewUser2027!",
  "first_name": "QA-AUTOTEST",
  "last_name": "Duplicate",
  "role": "admissions"
}
Then AssertStatus duplicate 400

When Post /api/v1/admin/users Into invalidRole Using adminSession.accessToken
{
  "email": "qa-autotest-invalidrole-${random()}@bluenest.test",
  "password": "NewUser2027!",
  "first_name": "QA-AUTOTEST",
  "last_name": "InvalidRole",
  "role": "qa-autotest-not-a-real-role"
}
Then AssertStatus invalidRole 400

Teardown
Delete /api/v1/admin/users/${created.body.data.id} Using adminSession.accessToken
```
