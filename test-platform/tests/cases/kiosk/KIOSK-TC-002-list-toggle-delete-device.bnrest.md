---
id: KIOSK-TC-002
number: 2.4.2
type: Test Case
title: A device appears in its branch's list, can be toggled inactive, and can be deleted
owner: QA
mode: Standalone
status: Active
tags:
  - kiosk
dependsOn: []
uses: []
fixtureScope: case
timeoutSeconds: 30
---

# List, toggle, delete a kiosk device

New coverage (`SUI-KIOSK-001`). Reads the shared `adminSession`/`branch`
suite fixtures — see `SUI-KIOSK-001`.

```bnrest
Given Post /api/v1/admin/kiosk-devices Into created Using adminSession.accessToken
{
  "name": "QA-AUTOTEST-ToggleTablet-${random()}",
  "branch_slug": "${branch.slug}"
}
Then AssertStatus created 201

When Get /api/v1/admin/kiosk-devices?branch=${branch.slug} Into list Using adminSession.accessToken
Then AssertStatus list 200
And AssertJson list "$.body.data[?(@.id=='${created.body.data.device.id}')].length()" == 1

When Patch /api/v1/admin/kiosk-devices/${created.body.data.device.id} Into toggled Using adminSession.accessToken
{
  "active": false
}
Then AssertStatus toggled 200
And Assert toggled.body.data.active == false

When Delete /api/v1/admin/kiosk-devices/${created.body.data.device.id} Into deleted Using adminSession.accessToken
Then AssertStatus deleted 204
```
