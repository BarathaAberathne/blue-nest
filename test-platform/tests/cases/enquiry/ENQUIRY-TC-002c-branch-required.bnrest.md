---
id: ENQUIRY-TC-002c
number: 1.7.4
type: Test Case
title: A branch is required
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

# Branch is required

Replaces legacy `EnquiryRegistrationSuite.tc_enq_002c_branchRequired`.
Reads the shared `adminSession` suite fixture — see `ENQUIRY-TC-001`.
Deliberately omits `branch` — doesn't need the shared dynamic branch at
all.

```bnrest
Given Post /api/v1/admin/enquiries Into rejected Using adminSession.accessToken
{
  "name": "QA-AUTOTEST No Branch",
  "email": "qa-autotest-nobranch-${random()}@bluenest.test",
  "enquiry_type": "General enquiry"
}
Then AssertStatus rejected 400
And AssertJson rejected $.body.error contains "branch"
```
