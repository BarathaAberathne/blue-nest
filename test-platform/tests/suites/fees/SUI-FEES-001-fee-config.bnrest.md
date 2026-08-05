---
id: SUI-FEES-001
number: "2.25"
type: Test Suite
title: Fee / funding rules config (public calculator + admin editor)
owner: QA
mode: Standalone
status: Active
tags:
  - fees
---

# Fee config suite

Covers the per-branch fee/funding rules that drive the public fee calculator:
the public bundle endpoint and the admin editor round-trip. Shares one admin login.

```bnrest
Setup
Call ../../utils/auth/AUTH-UTIL-001-login.bnrest.md With Json Into adminSession
{ "email": "admin@bluenest.uk", "password": "${secret:QA_ADMIN_PASSWORD}" }

Body
Call CatchError ../../cases/fees/FEE-TC-001-public-bundle.bnrest.md
Call CatchError ../../cases/fees/FEE-TC-002-admin-update-roundtrip.bnrest.md
```
