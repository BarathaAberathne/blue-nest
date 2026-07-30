---
id: KIOSK-TC-001
number: 2.4.1
type: Test Case
title: Creating a kiosk device returns a raw token alongside the device record
owner: QA
mode: Standalone
status: Active
tags:
  - kiosk
  - golden-path
dependsOn: []
uses: []
fixtureScope: case
timeoutSeconds: 30
---

# Create a kiosk device

New coverage (`SUI-KIOSK-001`, no legacy equivalent). Verified against
`internal/service/kiosk.go`'s `CreateDevice` — the raw token is bcrypt-
hashed for storage and returned exactly once in this response; it can
never be retrieved again (only `token_hint`, the last 4 chars, persists).
Reads the shared `adminSession`/`branch` suite fixtures — see
`SUI-KIOSK-001`.

```bnrest
Given Post /api/v1/admin/kiosk-devices Into created Using adminSession.accessToken
{
  "name": "QA-AUTOTEST-Tablet-${random()}",
  "branch_slug": "${branch.slug}"
}
Then AssertStatus created 201
And Assert created.body.data.device.id != null
And Assert created.body.data.token != null
And Assert created.body.data.device.active == true

Teardown
Delete /api/v1/admin/kiosk-devices/${created.body.data.device.id} Using adminSession.accessToken
```
