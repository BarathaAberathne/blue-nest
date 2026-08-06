---
id: SUI-BRANCHTPL-001
number: "2.26"
type: Test Suite
title: Branch templates (reusable branch setup)
owner: QA
mode: Standalone
status: Active
tags:
  - branch-templates
---

# Branch templates suite

Covers reusable branch-setup templates: create a template, apply it to a fresh
branch (creating its rooms), and verify the rooms landed. Creates its own test
branch so nothing real is touched.

```bnrest
Setup
Call ../../utils/auth/AUTH-UTIL-001-login.bnrest.md With Json Into adminSession
{ "email": "admin@bluenest.uk", "password": "${secret:QA_ADMIN_PASSWORD}" }

Call ../../utils/branch/BRANCH-FIX-001-create-test-branch.bnrest.md With Json Into branch
{ "accessToken": "${adminSession.accessToken}" }

Body
Call CatchError ../../cases/branchtpl/BRANCHTPL-TC-001-create-apply.bnrest.md

Teardown
Call ../../utils/branch/BRANCH-FIX-002-archive-test-branch.bnrest.md With Json Into archived
{ "accessToken": "${adminSession.accessToken}", "id": "${branch.id}" }
```
