---
id: SUI-EXPORT-001
number: "2.28"
type: Test Suite
title: CSV + Excel exports (reporting layer)
owner: QA
mode: Standalone
status: Active
tags:
  - export
---

# CSV + Excel export suite

Covers the server-side export endpoints (children/staff/enquiries/leave/
staff-attendance) that back the admin "Export" buttons — the CSV default and
the `?format=xlsx` Excel dispatch. Shares one admin login.

```bnrest
Setup
Call ../../utils/auth/AUTH-UTIL-001-login.bnrest.md With Json Into adminSession
{ "email": "admin@bluenest.uk", "password": "${secret:QA_ADMIN_PASSWORD}" }

Body
Call CatchError ../../cases/export/EXPORT-TC-001-csv-endpoints.bnrest.md
Call CatchError ../../cases/export/EXPORT-TC-002-xlsx-format.bnrest.md
Call CatchError ../../cases/export/EXPORT-TC-003-child-profile-pdf.bnrest.md
```
