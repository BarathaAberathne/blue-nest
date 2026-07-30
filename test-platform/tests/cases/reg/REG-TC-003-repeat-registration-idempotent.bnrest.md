---
id: REG-TC-003
number: 1.5.4
type: Test Case
title: Registering the same enquiry a second time does not create a second child
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

# Repeat registration is idempotent

Replaces legacy `EnquiryRegistrationSuite.tc_reg_003_preventDuplicateConversion`
— proves `childService.EnsureFromEnquiry`'s idempotency: a retry with a
**different** child name must still return 200 (not error) but must NOT
create a second child under that retried name, because the enquiry is
already linked to its first child.

```bnrest
Given Post /api/v1/admin/enquiries/${enquiry.id}/register Into retry Using adminSession.accessToken
{
  "registration_date": "2026-07-23T00:00:00Z",
  "expected_start_date": "2026-09-01T00:00:00Z",
  "child_age_group": "Under 1 year",
  "funding_type": "None",
  "child_first_name": "QA-AUTOTEST",
  "child_last_name": "SecondAttempt",
  "child_dob": "2026-03-01",
  "child_gender": ""
}
Then AssertStatus retry 200

When Get /api/v1/admin/children?branch=${branch.slug}&q=SecondAttempt Into search Using adminSession.accessToken
Then AssertJson search "$.body.data[?(@.last_name=='SecondAttempt')]" == 0
```
