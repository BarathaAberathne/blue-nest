---
id: PAYROLL-TC-001
number: 2.35.1
type: Test Case
title: The payroll summary rejects a missing or inverted date range
owner: QA
mode: Standalone
status: Active
tags:
  - payroll
dependsOn: []
uses: []
fixtureScope: case
timeoutSeconds: 30
---

# Payroll date-range validation

`GET /admin/payroll` requires `from` and `to` (YYYY-MM-DD, inclusive) and
rejects `to < from`. Reads the shared `adminSession` suite fixture — see
`SUI-PAYROLL-001`.

```bnrest
When Get /api/v1/admin/payroll Into missing Using adminSession.accessToken
Then AssertStatus missing 400
And AssertJson missing $.body.error contains "required"

When Get /api/v1/admin/payroll?from=${today("+40w+6d")}&to=${today("+40w")} Into inverted Using adminSession.accessToken
Then AssertStatus inverted 400
And AssertJson inverted $.body.error contains "after"
```
