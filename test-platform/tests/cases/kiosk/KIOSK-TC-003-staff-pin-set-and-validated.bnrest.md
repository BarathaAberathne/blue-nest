---
id: KIOSK-TC-003
number: 2.4.3
type: Test Case
title: A staff PIN must be 4-8 digits, and clearing it (empty string) resets has_pin to false
owner: QA
mode: Standalone
status: Active
tags:
  - kiosk
  - regression
dependsOn: []
uses: []
fixtureScope: case
timeoutSeconds: 30
---

# Staff PIN set/validate/clear

New coverage (`SUI-KIOSK-001`). Verified against
`internal/handler/admin/staff.go`'s `isValidPIN` (4-8 digits) and
`Staff.PINHash` (bcrypt, never returned — only the computed `has_pin`
boolean is). Reads the shared `adminSession`/`staff` suite fixtures — see
`SUI-KIOSK-001`.

```bnrest
Given Put /api/v1/admin/staff/${staff.id}/pin Into tooShort Using adminSession.accessToken
{
  "pin": "12"
}
Then AssertStatus tooShort 400

When Put /api/v1/admin/staff/${staff.id}/pin Into setPin Using adminSession.accessToken
{
  "pin": "4321"
}
Then AssertStatus setPin 200
And Assert setPin.body.data.has_pin == true

When Put /api/v1/admin/staff/${staff.id}/pin Into clearPin Using adminSession.accessToken
{
  "pin": ""
}
Then AssertStatus clearPin 200
And Assert clearPin.body.data.has_pin == false
```
