---
id: ENQUIRY-TC-002
number: 1.7.2
type: Test Case
title: A name is required to create an enquiry
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

# Name is required

Replaces legacy `EnquiryRegistrationSuite.tc_enq_002_nameRequired`. Reads
the shared `adminSession`/`branch` suite fixtures — see `ENQUIRY-TC-001`.

```bnrest
Given Post /api/v1/admin/enquiries Into rejected Using adminSession.accessToken
{
  "email": "qa-autotest-noname-${random()}@bluenest.test",
  "branch": "${branch.slug}",
  "enquiry_type": "General enquiry"
}
Then AssertStatus rejected 400
And AssertJson rejected $.body.error contains "name"
```
