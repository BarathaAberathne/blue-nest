---
id: SUI-VISIT-001
number: "1.8"
type: Test Suite
title: Visit Booking
owner: QA
mode: Standalone
status: Active
tags:
  - visit
---

# Visit Booking suite

Migrates the two visit-booking status transitions from legacy
`EnquiryRegistrationSuite` (`tc_visit_001`/`tc_visit_004` — expressed
purely as enquiry status transitions, there is no separate "visit" entity
in this backend). Kept as its own suite rather than folded into
`SUI-ENQUIRY-001`, matching the manifest's original suite grouping.
`Setup` creates a dynamic branch and an enquiry, then brings it to
`contacted` (the real precondition the legacy test itself relied on,
having already done `new → contacted` earlier in its own ordered run).

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

Post /api/v1/admin/enquiries Into enquiry Using adminSession.accessToken
{
  "name": "QA-AUTOTEST-VisitParent-${random()}",
  "email": "qa-autotest-visit-parent-${random()}@bluenest.test",
  "phone": "07000000098",
  "branch": "${branch.slug}",
  "enquiry_type": "General enquiry",
  "source": "phone"
}
AssertStatus enquiry 201

Patch /api/v1/admin/enquiries/${enquiry.body.data.id}/status Into contacted Using adminSession.accessToken
{
  "status": "contacted"
}
AssertStatus contacted 200

Body
Call CatchError ../../cases/visit/VISIT-TC-001-book-visit.bnrest.md
Call CatchError ../../cases/visit/VISIT-TC-004-complete-visit.bnrest.md

Teardown
Call ../../utils/branch/BRANCH-FIX-002-archive-test-branch.bnrest.md With Json Into cleanup
{
  "accessToken": "${adminSession.accessToken}",
  "slug": "${branch.slug}"
}
```
