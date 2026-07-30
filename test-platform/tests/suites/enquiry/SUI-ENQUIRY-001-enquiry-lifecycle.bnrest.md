---
id: SUI-ENQUIRY-001
number: "1.7"
type: Test Suite
title: Enquiry Lifecycle
owner: QA
mode: Standalone
status: Active
tags:
  - enquiry
---

# Enquiry Lifecycle suite

Migrates the enquiry-CRM-specific tests from legacy
`EnquiryRegistrationSuite` (the registration-specific tests from the same
class are `SUI-REG-001`'s concern, not this suite's — see
`test-migration-map.md`'s suite-grouping rationale). `Setup` creates a
dynamic throwaway branch (`BRANCH-FIX-001`), a shared admin session, and a
deterministic `enquirySuffix` (spec §2 `suite` fixture scope).
`ENQUIRY-TC-001` creates the pipeline enquiry first;
`ENQUIRY-TC-004`/`005`/`006` are genuinely order-dependent on it (each
declares `dependsOn`) and rediscover it by name via `ENQUIRY-UTIL-002`
rather than a passed id, since case-to-case variables aren't shared in
this engine. `ENQUIRY-TC-002*`/`003`/`003b` are fully independent
validation/regression cases that only read the shared `branch`.

```bnrest
Setup
Call ../../utils/auth/AUTH-UTIL-001-login.bnrest.md With Json Into adminSession
{
  "email": "admin@bluenest.uk",
  "password": "${secret:QA_ADMIN_PASSWORD}"
}

Call ../../utils/branch/BRANCH-FIX-001-create-test-branch.bnrest.md With Json Into branch
{
  "accessToken": "${adminSession.accessToken}"
}

Set enquirySuffix = random()

Body
Call CatchError ../../cases/enquiry/ENQUIRY-TC-001-creates-enquiry-once.bnrest.md
Call CatchError ../../cases/enquiry/ENQUIRY-TC-002-name-required.bnrest.md
Call CatchError ../../cases/enquiry/ENQUIRY-TC-002b-email-or-phone-required.bnrest.md
Call CatchError ../../cases/enquiry/ENQUIRY-TC-002c-branch-required.bnrest.md
Call CatchError ../../cases/enquiry/ENQUIRY-TC-002d-enquiry-type-required.bnrest.md
Call CatchError ../../cases/enquiry/ENQUIRY-TC-003-duplicate-submission-merges.bnrest.md
Call CatchError ../../cases/enquiry/ENQUIRY-TC-003b-post-registration-not-merged.bnrest.md
Call CatchError ../../cases/enquiry/ENQUIRY-TC-004-visible-with-full-detail.bnrest.md
Call CatchError ../../cases/enquiry/ENQUIRY-TC-005-note-records-author-and-timestamp.bnrest.md
Call CatchError ../../cases/enquiry/ENQUIRY-TC-006-status-transition-new-to-contacted.bnrest.md

Teardown
Call ../../utils/branch/BRANCH-FIX-002-archive-test-branch.bnrest.md With Json Into cleanup
{
  "accessToken": "${adminSession.accessToken}",
  "slug": "${branch.slug}"
}
```
