---
id: CHILD-UTIL-001
number: U.8
type: Test Util
title: Register an enquiry with child details (creates the Child)
owner: QA Platform
mode: Standalone
status: Active
tags:
  - enquiry
  - child
fixtureScope: case
timeoutSeconds: 30
---

# Register an enquiry with child details

Calls `POST /admin/enquiries/{id}/register` — this backend's real
registration flow: passing `child_first_name`/`child_last_name`/`child_dob`
alongside the registration fields makes the handler create the Child record
in the same request (`AdminEnquiryHandler.Register` →
`childService.EnsureFromEnquiry`), not a separate step. The response is the
**updated Enquiry**, not the Child — the link only exists on the Child side
(`enquiry_id`), so this looks the new child up by branch + name search
straight after, exactly like the legacy `EnquiryRegistrationSuite` had to.

Inputs: `input.accessToken`, `input.enquiryId`, `input.branchSlug`,
`input.firstName`, `input.lastName`, `input.dob`, `input.ageGroup`,
`input.fundingType`, `input.expectedStartDate` (RFC3339, e.g.
`2026-09-01T00:00:00Z`).

```bnrest
Post /api/v1/admin/enquiries/${input.enquiryId}/register Into registered Using input.accessToken
{
  "registration_date": "2026-07-23T00:00:00Z",
  "expected_start_date": "${input.expectedStartDate}",
  "child_age_group": "${input.ageGroup}",
  "funding_type": "${input.fundingType}",
  "child_first_name": "${input.firstName}",
  "child_last_name": "${input.lastName}",
  "child_dob": "${input.dob}",
  "child_gender": ""
}

AssertStatus registered 200
Assert registered.body.data.status == "registered"

Get /api/v1/admin/children?branch=${input.branchSlug}&q=${input.lastName} Into search Using input.accessToken
AssertStatus search 200

CopyJson search "$.body.data[?(@.first_name=='${input.firstName}' && @.last_name=='${input.lastName}')]" Into child
Assert child.id != null

Output
{
  "id": "${child.id}",
  "ref": "${child.ref}",
  "firstName": "${child.first_name}",
  "lastName": "${child.last_name}",
  "branchSlug": "${input.branchSlug}",
  "enquiryId": "${input.enquiryId}"
}
```
