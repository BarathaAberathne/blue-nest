---
id: SUI-EMAILTPL-001
number: "2.27"
type: Test Suite
title: Email templates (editable transactional copy)
owner: QA
mode: Standalone
status: Active
tags:
  - email-templates
---

# Email templates suite

Covers the per-org editable transactional email copy: the catalogue lists
defaults, an admin can customise a template, and revert it. Shares one admin login.

```bnrest
Setup
Call ../../utils/auth/AUTH-UTIL-001-login.bnrest.md With Json Into adminSession
{ "email": "admin@bluenest.uk", "password": "${secret:QA_ADMIN_PASSWORD}" }

Body
Call CatchError ../../cases/emailtpl/EMAILTPL-TC-001-customise-revert.bnrest.md
```
