---
id: USER-TC-008
number: 2.7.8
type: Test Case
title: A super-admin can create, list and delete an org-wide dashboard profile default for a role
owner: QA
mode: Standalone
status: Active
tags:
  - useraccount
dependsOn: []
uses: []
fixtureScope: case
timeoutSeconds: 30
---

# Org-wide dashboard profiles

New coverage (`SUI-USERACCOUNT-001`). Verified against
`internal/handler/admin/dashboard_profiles.go`. Reads the shared
`adminSession` suite fixture — see `SUI-USERACCOUNT-001`.

```bnrest
Given Post /api/v1/admin/dashboard-profiles Into created Using adminSession.accessToken
{
  "name": "QA-AUTOTEST Profile ${random()}",
  "description": "A test dashboard profile",
  "widgets": [{"key": "enquiries", "hidden": false, "size": "normal"}],
  "default_for_roles": ["admissions"]
}
Then AssertStatus created 200
And Assert created.body.data.slug != null

When Get /api/v1/admin/dashboard-profiles Into list Using adminSession.accessToken
Then AssertStatus list 200
And AssertJson list "$.body.data.profiles[?(@.slug=='${created.body.data.slug}')].length()" == 1

When Delete /api/v1/admin/dashboard-profiles/${created.body.data.slug} Into deleted Using adminSession.accessToken
Then AssertStatus deleted 204
```
