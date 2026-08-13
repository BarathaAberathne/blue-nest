---
id: SUI-REG-001
number: "1.5"
type: Test Suite
title: Child Registration
owner: QA
mode: Standalone
status: Active
tags:
  - registration
  - child
---

# Child Registration suite

Migrates legacy `EnquiryRegistrationSuite`'s registration-specific tests
(`tc_reg_001`..`tc_reg_004` — the enquiry/CRM-status tests from the same
class are `SUI-ENQUIRY-001`'s concern, not this suite's). `Setup` creates a
dynamic throwaway branch (`BRANCH-FIX-001`) and **one shared enquiry**
(spec §2 `suite` fixture scope — mirrors the legacy class's own
`@BeforeAll`-created enquiry). `REG-TC-001` registers it first;
`REG-TC-001b`/`002`/`003` are genuinely order-dependent on that
registration having happened (each declares `dependsOn: [REG-TC-001]`).
`REG-TC-004` is fully self-contained (creates its own second enquiry) —
matches the legacy test's own fixture.

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
Call ../../utils/enquiry/ENQUIRY-UTIL-001-submit-enquiry.bnrest.md With Json Into enquiry
{
  "accessToken": "${adminSession.accessToken}",
  "branchSlug": "${branch.slug}",
  "name": "QA-AUTOTEST-RegParent-${enquirySuffix}",
  "email": "qa-autotest-reg-parent-${enquirySuffix}@bluenest.test",
  "phone": "07000000098",
  "enquiryType": "General enquiry",
  "source": "phone"
}

Body
Call CatchError ../../cases/reg/REG-TC-001-register-creates-child-once.bnrest.md
Call CatchError ../../cases/reg/REG-TC-001b-expected-start-date-no-timezone-shift.bnrest.md
Call CatchError ../../cases/reg/REG-TC-002-appears-once-in-registered.bnrest.md
Call CatchError ../../cases/reg/REG-TC-003-repeat-registration-idempotent.bnrest.md
Call CatchError ../../cases/reg/REG-TC-004-registration-not-atomic-gap-lock.bnrest.md
Call CatchError ../../cases/reg/REG-TC-005-future-dob-rejected.bnrest.md
Call CatchError ../../cases/reg/REG-TC-006-room-allocation-on-registration.bnrest.md
Call CatchError ../../cases/reg/REG-TC-007-child-profile-photo.bnrest.md

Teardown
Call ../../utils/branch/BRANCH-FIX-002-archive-test-branch.bnrest.md With Json Into cleanup
{
  "accessToken": "${adminSession.accessToken}",
  "slug": "${branch.slug}"
}
```
