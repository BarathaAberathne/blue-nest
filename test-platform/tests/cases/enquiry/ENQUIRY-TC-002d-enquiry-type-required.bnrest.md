---
id: ENQUIRY-TC-002d
number: 1.7.5
type: Test Case
title: An enquiry type is required
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

# Enquiry type is required

Replaces legacy `EnquiryRegistrationSuite.tc_enq_002d_enquiryTypeRequired`.
Reads the shared `adminSession`/`branch` suite fixtures — see
`ENQUIRY-TC-001`.

```bnrest
Given Post /api/v1/admin/enquiries Into rejected Using adminSession.accessToken
{
  "name": "QA-AUTOTEST No Type",
  "email": "qa-autotest-notype-${random()}@bluenest.test",
  "branch": "${branch.slug}"
}
Then AssertStatus rejected 400
And AssertJson rejected $.body.error contains "enquiry type"
```
