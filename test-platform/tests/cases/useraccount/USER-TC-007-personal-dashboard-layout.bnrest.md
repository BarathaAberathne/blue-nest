---
id: USER-TC-007
number: 2.7.7
type: Test Case
title: A user can save, activate, list and delete their own named dashboard layout
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

# Personal dashboard layout

New coverage (`SUI-USERACCOUNT-001`). Verified against
`internal/handler/dashboard_layout.go`. Reads the shared `adminSession`
suite fixture — see `SUI-USERACCOUNT-001`.

```bnrest
Given Put /api/v1/me/dashboard Into saved Using adminSession.accessToken
{
  "name": "QA-AUTOTEST-Layout-${random()}",
  "widgets": [
    {"key": "enquiries", "hidden": false, "size": "wide"},
    {"key": "orders", "hidden": true}
  ]
}
Then AssertStatus saved 200
And Assert saved.body.data.active == true

When Get /api/v1/me/dashboards Into list Using adminSession.accessToken
Then AssertStatus list 200
And AssertJson list "$.body.data.layouts[?(@.name=='${saved.body.data.name}')].length()" == 1

When Get /api/v1/me/dashboard Into current Using adminSession.accessToken
Then AssertStatus current 200
And Assert current.body.data.name == saved.body.data.name

When Post /api/v1/me/dashboards/activate Into activateMissingName Using adminSession.accessToken
{
  "name": ""
}
Then AssertStatus activateMissingName 400

When Delete /api/v1/me/dashboards/${saved.body.data.name} Into deleted Using adminSession.accessToken
Then AssertStatus deleted 200
```
