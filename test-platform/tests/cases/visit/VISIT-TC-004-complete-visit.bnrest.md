---
id: VISIT-TC-004
number: 1.8.2
type: Test Case
title: Booked visit -> Visit completed is a valid status transition
owner: QA
mode: Dependent
status: Active
tags:
  - visit
  - golden-path
dependsOn:
  - VISIT-TC-001
uses: []
fixtureScope: case
timeoutSeconds: 30
---

# Booked visit -> Visit completed

Replaces legacy `EnquiryRegistrationSuite.tc_visit_004_completeVisit`.
Genuinely `dependsOn: [VISIT-TC-001]` — needs the enquiry to actually be
`booked_visit` first. Reads the shared `adminSession`/`enquiry` suite
fixtures — see `SUI-VISIT-001`.

```bnrest
Given Patch /api/v1/admin/enquiries/${enquiry.body.data.id}/status Into completed Using adminSession.accessToken
{
  "status": "visit_completed"
}
Then AssertStatus completed 200
And Assert completed.body.data.status == "visit_completed"
```
