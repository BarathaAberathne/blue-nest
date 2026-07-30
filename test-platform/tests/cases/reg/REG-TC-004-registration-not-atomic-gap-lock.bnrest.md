---
id: REG-TC-004
number: 1.5.5
type: Test Case
title: Registering with no child fields still flips the enquiry to Registered (gap lock)
owner: QA
mode: Standalone
status: Active
tags:
  - registration
  - regression
dependsOn: []
uses:
  - ENQUIRY-UTIL-001
fixtureScope: case
timeoutSeconds: 30
---

# Registration is not atomic with child creation (documented gap)

Replaces legacy
`EnquiryRegistrationSuite.tc_reg_004_registrationNotAtomicWithChildCreation`
— a **gap lock**, not a bug fix target: the real system flips the enquiry
straight to `registered` even when no `child_first_name`/`child_last_name`/
`child_dob` are supplied (`EnsureFromEnquiry` is only invoked when those
fields are present — see `AdminEnquiryHandler.Register`). Nothing enforces
that "registered" implies a Child record exists. Self-contained — creates
its own enquiry rather than reusing the suite's shared one.

```bnrest
Setup
Set gap004Suffix = random()
Call ../../utils/enquiry/ENQUIRY-UTIL-001-submit-enquiry.bnrest.md With Json Into fixtureEnquiry
{
  "accessToken": "${adminSession.accessToken}",
  "branchSlug": "${branch.slug}",
  "name": "QA-AUTOTEST-Reg004Parent-${gap004Suffix}",
  "email": "qa-autotest-reg004-parent-${gap004Suffix}@bluenest.test",
  "phone": "07000000097",
  "enquiryType": "General enquiry",
  "source": "phone"
}

Body
When Post /api/v1/admin/enquiries/${fixtureEnquiry.id}/register Into result Using adminSession.accessToken
{
  "registration_date": "2026-07-23T00:00:00Z",
  "expected_start_date": "2026-09-01T00:00:00Z"
}
Then AssertStatus result 200
And AssertJson result $.body.data.status == "registered"
And AssertJson result $.body.data.registration.is_registered == true
```
