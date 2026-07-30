---
id: REG-TC-001
number: 1.5.1
type: Test Case
title: Registering the enquiry creates exactly one Child, links it, sets status Registered
owner: QA
mode: Standalone
status: Active
tags:
  - registration
  - golden-path
dependsOn: []
uses:
  - CHILD-UTIL-001
fixtureScope: case
timeoutSeconds: 30
---

# Registering the enquiry creates the Child

Replaces legacy `EnquiryRegistrationSuite.tc_reg_001_registerCreatesChildOnce`.
Reads the shared `adminSession`/`branch`/`enquiry` suite fixtures — see
`SUI-REG-001`. Runs **first** in the suite's `Body` — `REG-TC-001b`,
`REG-TC-002` and `REG-TC-003` all depend on this registration having
actually happened.

```bnrest
Set childSuffix = random()

Given Call ../../utils/child/CHILD-UTIL-001-register-child-from-enquiry.bnrest.md With Json Into created
{
  "accessToken": "${adminSession.accessToken}",
  "enquiryId": "${enquiry.id}",
  "branchSlug": "${branch.slug}",
  "firstName": "QA-AUTOTEST",
  "lastName": "RegChild-${childSuffix}",
  "dob": "2026-03-01",
  "ageGroup": "Under 1 year",
  "fundingType": "None",
  "expectedStartDate": "2026-09-01T00:00:00Z"
}
Then Assert created.id != null

When Get /api/v1/admin/enquiries/${enquiry.id} Into fetched Using adminSession.accessToken
Then AssertStatus fetched 200
And AssertJson fetched $.body.data.status == "registered"
And AssertJson fetched $.body.data.registration.is_registered == true
```
