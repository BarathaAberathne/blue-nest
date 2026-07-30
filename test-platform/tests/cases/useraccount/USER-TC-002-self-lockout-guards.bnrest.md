---
id: USER-TC-002
number: 2.7.2
type: Test Case
title: A super-admin cannot change their own role or delete their own account, but CAN update another user's role and reset their password
owner: QA
mode: Standalone
status: Active
tags:
  - useraccount
  - regression
dependsOn: []
uses: []
fixtureScope: case
timeoutSeconds: 30
---

# Self-lockout guards, and updating another user

New coverage (`SUI-USERACCOUNT-001`). Verified against
`internal/handler/admin/users.go`'s handler-level self-lockout checks.
Reads the shared `adminSession` suite fixture — see `SUI-USERACCOUNT-001`.

```bnrest
Given Get /api/v1/auth/me Into me Using adminSession.accessToken
Then AssertStatus me 200

When Put /api/v1/admin/users/${me.body.data.id} Into selfRoleChange Using adminSession.accessToken
{
  "role": "admissions"
}
Then AssertStatus selfRoleChange 400

When Delete /api/v1/admin/users/${me.body.data.id} Into selfDelete Using adminSession.accessToken
Then AssertStatus selfDelete 400

When Post /api/v1/admin/users Into other Using adminSession.accessToken
{
  "email": "qa-autotest-otheruser-${random()}@bluenest.test",
  "password": "OtherUser2027!",
  "first_name": "QA-AUTOTEST",
  "last_name": "OtherUser",
  "role": "admissions"
}
Then AssertStatus other 201

When Put /api/v1/admin/users/${other.body.data.id} Into roleChange Using adminSession.accessToken
{
  "role": "procurement"
}
Then AssertStatus roleChange 200
And Assert roleChange.body.data.role == "procurement"

When Post /api/v1/admin/users/${other.body.data.id}/reset-password Into reset Using adminSession.accessToken
{
  "password": "ResetPassword2027!"
}
Then AssertStatus reset 200

Teardown
Delete /api/v1/admin/users/${other.body.data.id} Using adminSession.accessToken
```
