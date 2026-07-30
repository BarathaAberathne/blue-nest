---
id: USER-TC-004
number: 2.7.4
type: Test Case
title: A custom role can be created (unknown permissions silently dropped), collides cleanly with a built-in name, and can be updated/deleted (but not a built-in)
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

# Custom role lifecycle

New coverage (`SUI-USERACCOUNT-001`). Verified against
`internal/handler/admin/roles.go`. Reads the shared `adminSession` suite
fixture — see `SUI-USERACCOUNT-001`.

```bnrest
Given Post /api/v1/admin/roles Into created Using adminSession.accessToken
{
  "name": "qa-autotest-role-${random()}",
  "label": "QA-AUTOTEST Custom Role",
  "permissions": ["dashboard.view", "qa-autotest-not-a-real-permission"]
}
Then AssertStatus created 201
And Assert created.body.data.is_custom == true
And AssertJson created "$.body.data.permissions" contains "dashboard.view"
And AssertJson created "$.body.data.permissions" == 1

When Post /api/v1/admin/roles Into collideBuiltIn Using adminSession.accessToken
{
  "name": "admin",
  "permissions": ["dashboard.view"]
}
Then AssertStatus collideBuiltIn 400

When Post /api/v1/admin/roles Into collideCustom Using adminSession.accessToken
{
  "name": "${created.body.data.name}",
  "permissions": ["dashboard.view"]
}
Then AssertStatus collideCustom 400

When Put /api/v1/admin/roles/${created.body.data.name} Into updated Using adminSession.accessToken
{
  "permissions": ["dashboard.view", "audit.view"]
}
Then AssertStatus updated 200
And AssertJson updated "$.body.data.permissions" contains "audit.view"

When Delete /api/v1/admin/roles/admin Into deleteBuiltIn Using adminSession.accessToken
Then AssertStatus deleteBuiltIn 400

When Delete /api/v1/admin/roles/${created.body.data.name} Into deleted Using adminSession.accessToken
Then AssertStatus deleted 204
```
