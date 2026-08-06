---
id: ENQUIRY-TC-003b
number: 1.7.7
type: Test Case
title: A submission from the same email AFTER the first is Registered is treated as genuinely new, not merged
owner: QA
mode: Standalone
status: Active
tags:
  - enquiry
  - regression
dependsOn: []
uses: []
fixtureScope: case
timeoutSeconds: 30
---

# New enquiry after Registered is not merged

Replaces legacy
`EnquiryRegistrationSuite.tc_enq_003b_newEnquiryAfterRegisteredIsNotMerged`.
Reads the shared `adminSession`/`branch` suite fixtures — see
`ENQUIRY-TC-001`. `registered` is not one of the "open pipeline" statuses
`mergeIfDuplicate` merges into, so a second submission from the same email
(e.g. enquiring about a second child) must be its own new record.

```bnrest
Set postRegSuffix = random()

Given Post /api/v1/admin/enquiries Into first Using adminSession.accessToken
{
  "name": "QA-AUTOTEST Post-Registration",
  "email": "qa-autotest-post-reg-enquiry-${postRegSuffix}@bluenest.test",
  "branch": "${branch.slug}",
  "enquiry_type": "General enquiry"
}
Then AssertStatus first 201

When Patch /api/v1/admin/enquiries/${first.body.data.id}/status Into contacted Using adminSession.accessToken
{
  "status": "contacted"
}
Then AssertStatus contacted 200

When Post /api/v1/admin/enquiries/${first.body.data.id}/register Into registered Using adminSession.accessToken
{
  "registration_date": "${today("-1w")}T00:00:00Z",
  "expected_start_date": "${today("+1m")}T00:00:00Z"
}
Then AssertStatus registered 200
And Assert registered.body.data.status == "registered"

When Post /api/v1/admin/enquiries Into second Using adminSession.accessToken
{
  "name": "QA-AUTOTEST Post-Registration",
  "email": "qa-autotest-post-reg-enquiry-${postRegSuffix}@bluenest.test",
  "branch": "${branch.slug}",
  "enquiry_type": "General enquiry"
}
Then AssertStatus second 201
And Assert second.body.data.id != first.body.data.id
```
