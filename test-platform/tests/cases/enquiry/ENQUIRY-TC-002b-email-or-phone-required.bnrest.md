---
id: ENQUIRY-TC-002b
number: 1.7.3
type: Test Case
title: Either an email or a phone number is required
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

# Email or phone is required

Replaces legacy `EnquiryRegistrationSuite.tc_enq_002b_emailOrPhoneRequired`.
Reads the shared `adminSession`/`branch` suite fixtures — see
`ENQUIRY-TC-001`.

```bnrest
Given Post /api/v1/admin/enquiries Into rejected Using adminSession.accessToken
{
  "name": "QA-AUTOTEST No Contact Method",
  "branch": "${branch.slug}",
  "enquiry_type": "General enquiry"
}
Then AssertStatus rejected 400
And AssertJson rejected $.body.error contains "email or phone"
```
