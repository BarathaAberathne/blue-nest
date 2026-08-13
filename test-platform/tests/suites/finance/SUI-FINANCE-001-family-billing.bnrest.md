---
id: SUI-FINANCE-001
number: "2.31"
type: Test Suite
title: Family billing, charges, payments & the onboarding finance gate
owner: QA
mode: Standalone
status: Active
tags:
  - finance
---

# Finance suite

Phase 5 of docs/features/family-onboarding-finance-plan.md: family accounts
built from canonical parent relationships (siblings share one family),
charges with derived balances, manual payments with oldest-first
auto-allocation, the first-payment + mandate onboarding gate, and the
parent-portal finance scope.

```bnrest
Setup
Call ../../utils/auth/AUTH-UTIL-001-login.bnrest.md With Json Into adminSession
{ "email": "admin@bluenest.uk", "password": "${secret:QA_ADMIN_PASSWORD}" }

Call ../../utils/branch/BRANCH-FIX-001-create-test-branch.bnrest.md With Json Into branch
{ "accessToken": "${adminSession.accessToken}" }

Call ../../utils/child/CHILD-UTIL-003-create-child-direct.bnrest.md With Json Into child
{ "accessToken": "${adminSession.accessToken}", "branchSlug": "${branch.slug}", "firstName": "QA-AUTOTEST", "lastName": "Finance-${random()}", "dob": "${today("-30m")}" }

Body
Call CatchError ../../cases/finance/FIN-TC-001-family-and-charges.bnrest.md
Call CatchError ../../cases/finance/FIN-TC-002-payments-and-onboarding-gate.bnrest.md
Call CatchError ../../cases/finance/FIN-TC-003-portal-finance-scope.bnrest.md
Call CatchError ../../cases/finance/FIN-TC-004-reminders-and-communications.bnrest.md

Teardown
Delete /api/v1/admin/children/${child.id} Using adminSession.accessToken
Call ../../utils/branch/BRANCH-FIX-002-archive-test-branch.bnrest.md With Json Into cleanup
{ "accessToken": "${adminSession.accessToken}", "slug": "${branch.slug}" }
```
