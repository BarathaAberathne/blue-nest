---
id: SUI-INDUCT-001
number: "2.30"
type: Test Suite
title: Child induction, consents & onboarding completeness
owner: QA
mode: Standalone
status: Active
tags:
  - induction
---

# Induction & consents suite

Phase 4 of docs/features/family-onboarding-finance-plan.md: section
save/resume with canonical write-through, the submit gate, four-eyes review,
append-only consents, and the derived onboarding completeness view — plus
the parent-portal path (save + sign as an activated parent, foreign child
404s).

```bnrest
Setup
Call ../../utils/auth/AUTH-UTIL-001-login.bnrest.md With Json Into adminSession
{ "email": "admin@bluenest.uk", "password": "${secret:QA_ADMIN_PASSWORD}" }

Call ../../utils/branch/BRANCH-FIX-001-create-test-branch.bnrest.md With Json Into branch
{ "accessToken": "${adminSession.accessToken}" }

Call ../../utils/child/CHILD-UTIL-003-create-child-direct.bnrest.md With Json Into child
{ "accessToken": "${adminSession.accessToken}", "branchSlug": "${branch.slug}", "firstName": "QA-AUTOTEST", "lastName": "Induct-${random()}", "dob": "${today("-30m")}" }

# Second reviewer for the four-eyes sign-off.
Set reviewerSuffix = random()
Post /api/v1/admin/users Into reviewer Using adminSession.accessToken
{ "email": "qa-autotest-reviewer-${reviewerSuffix}@bluenest.test", "password": "Reviewer-2026!", "first_name": "QA-AUTOTEST", "last_name": "Reviewer", "role": "branch_manager" }
AssertStatus reviewer 201

Call ../../utils/auth/AUTH-UTIL-001-login.bnrest.md With Json Into reviewerSession
{ "email": "qa-autotest-reviewer-${reviewerSuffix}@bluenest.test", "password": "Reviewer-2026!" }

Body
# TC-004 first — it needs a not-yet-reviewed induction (TC-001 signs it off).
Call CatchError ../../cases/induction/INDUCT-TC-004-empty-complete-rejected.bnrest.md
Call CatchError ../../cases/induction/INDUCT-TC-001-sections-writethrough-review.bnrest.md
Call CatchError ../../cases/induction/INDUCT-TC-002-consents-and-completeness.bnrest.md
Call CatchError ../../cases/induction/INDUCT-TC-003-portal-parent-path.bnrest.md

Teardown
Delete /api/v1/admin/children/${child.id} Using adminSession.accessToken
Delete /api/v1/admin/users/${reviewer.body.data.id} Using adminSession.accessToken
Call ../../utils/branch/BRANCH-FIX-002-archive-test-branch.bnrest.md With Json Into cleanup
{ "accessToken": "${adminSession.accessToken}", "slug": "${branch.slug}" }
```
