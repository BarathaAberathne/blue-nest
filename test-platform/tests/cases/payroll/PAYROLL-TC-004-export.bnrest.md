---
id: PAYROLL-TC-004
number: 2.35.4
type: Test Case
title: The payroll export streams a CSV (default) or Excel download with the same scope and validation as the summary
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

# Payroll export (CSV + Excel)

`GET /admin/payroll/export` shares the summary's date validation and
branch scope; `?format=xlsx` selects Excel via the shared `export.Write`
dispatcher. Reads the shared `adminSession`/`branch` suite fixtures — see
`SUI-PAYROLL-001`.

```bnrest
When Get /api/v1/admin/payroll/export?from=${today("+40w")}&to=${today("+40w+6d")}&branch=${branch.slug} Into csv Using adminSession.accessToken
Then AssertStatus csv 200

When Get /api/v1/admin/payroll/export?from=${today("+40w")}&to=${today("+40w+6d")}&branch=${branch.slug}&format=xlsx Into xlsx Using adminSession.accessToken
Then AssertStatus xlsx 200

When Get /api/v1/admin/payroll/export Into invalid Using adminSession.accessToken
Then AssertStatus invalid 400
```
