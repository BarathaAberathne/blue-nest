---
id: REG-TC-001b
number: 1.5.2
type: Test Case
title: The expected start date round-trips to the exact same calendar date, no timezone shift
owner: QA
mode: Standalone
status: Active
tags:
  - registration
  - regression
dependsOn:
  - REG-TC-001
uses: []
fixtureScope: case
timeoutSeconds: 30
---

# No timezone shift on the expected start date (regression)

Replaces legacy
`EnquiryRegistrationSuite.tc_reg_001b_expectedStartDateHasNoTimezoneShift`.
Submitted `${today("+1m")}T00:00:00Z` in `REG-TC-001` — must read back as the
same UTC calendar date. Pre-fix, local-time interpretation of the date
input shifted this back a day in a UTC+1 timezone; the API contract
itself was always correct — this is a regression lock against that bug
being reintroduced anywhere in the chain (frontend or backend).
`dependsOn: [REG-TC-001]` — needs that case's registration to have actually
happened, not just the suite `Setup`'s enquiry to exist.

```bnrest
Given Get /api/v1/admin/enquiries/${enquiry.id} Into fetched Using adminSession.accessToken
Then AssertStatus fetched 200
And AssertJson fetched $.body.data.registration.expected_start_date contains "${today("+1m")}"
```
