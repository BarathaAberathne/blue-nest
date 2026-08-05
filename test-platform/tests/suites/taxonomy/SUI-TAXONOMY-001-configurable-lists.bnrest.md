---
id: SUI-TAXONOMY-001
number: "2.21"
type: Test Suite
title: Configurable lists (taxonomy) + term dates
owner: QA
mode: Standalone
status: Active
tags:
  - taxonomy
---

# Configurable lists + term dates suite

New coverage for the tenant/branch-scoped configurable lookup lists
(`taxonomy_terms`: session slots, allergy/dietary tags) that replace the
hardcoded dropdown values, and the term-time date ranges (`terms`). CRUD +
validation via the admin endpoints, sharing one admin login.

```bnrest
Setup
Call ../../utils/auth/AUTH-UTIL-001-login.bnrest.md With Json Into adminSession
{ "email": "admin@bluenest.uk", "password": "${secret:QA_ADMIN_PASSWORD}" }

Body
Call CatchError ../../cases/taxonomy/TAX-TC-001-session-type-crud.bnrest.md
Call CatchError ../../cases/taxonomy/TAX-TC-002-term-crud.bnrest.md
Call CatchError ../../cases/taxonomy/TAX-TC-003-term-time-attendance.bnrest.md
Call CatchError ../../cases/taxonomy/TAX-TC-004-age-group-crud.bnrest.md
```
