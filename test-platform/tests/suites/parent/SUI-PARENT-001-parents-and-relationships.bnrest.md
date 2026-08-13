---
id: SUI-PARENT-001
number: "2.29"
type: Test Suite
title: Parents / guardians — canonical records, child links, portal invitations
owner: QA
mode: Standalone
status: Active
tags:
  - parent
---

# Parent & relationship suite

Covers the canonical Parent domain (Phase 3 of
docs/features/family-onboarding-finance-plan.md): parent CRUD, child↔parent
links (multi-guardian, sibling create-or-link by email, duplicate rejection,
linked-parent delete guard) and the secure portal invitation lifecycle
(portal-flag prerequisite, activation, single-use token, customer login).

```bnrest
Setup
Call ../../utils/auth/AUTH-UTIL-001-login.bnrest.md With Json Into adminSession
{ "email": "admin@bluenest.uk", "password": "${secret:QA_ADMIN_PASSWORD}" }

Call ../../utils/branch/BRANCH-FIX-001-create-test-branch.bnrest.md With Json Into branch
{ "accessToken": "${adminSession.accessToken}" }

Call ../../utils/child/CHILD-UTIL-003-create-child-direct.bnrest.md With Json Into child
{ "accessToken": "${adminSession.accessToken}", "branchSlug": "${branch.slug}", "firstName": "QA-AUTOTEST", "lastName": "ParentChild-${random()}", "dob": "${today("-30m")}" }

Body
Call CatchError ../../cases/parent/PARENT-TC-001-link-multi-guardian.bnrest.md
Call CatchError ../../cases/parent/PARENT-TC-002-sibling-shares-parent.bnrest.md
Call CatchError ../../cases/parent/PARENT-TC-003-portal-invitation-lifecycle.bnrest.md
Call CatchError ../../cases/parent/PARENT-TC-004-portal-idor-scope.bnrest.md

Teardown
Delete /api/v1/admin/children/${child.id} Using adminSession.accessToken
Call ../../utils/branch/BRANCH-FIX-002-archive-test-branch.bnrest.md With Json Into cleanup
{ "accessToken": "${adminSession.accessToken}", "slug": "${branch.slug}" }
```
