---
id: VISIT-TC-001
number: 1.8.1
type: Test Case
title: Contacted -> Booked visit is a valid status transition
owner: QA
mode: Standalone
status: Active
tags:
  - visit
  - golden-path
dependsOn: []
uses: []
fixtureScope: case
timeoutSeconds: 30
---

# Contacted -> Booked visit

Replaces legacy `EnquiryRegistrationSuite.tc_visit_001_bookVisit` (kept as
its own suite per the manifest's original suite grouping, distinct from
`SUI-ENQUIRY-001`). Reads the shared `adminSession`/`enquiry` suite
fixtures — see `SUI-VISIT-001` (its `Setup` already brings the enquiry to
`contacted`, the precondition for booking a visit).

```bnrest
Given Patch /api/v1/admin/enquiries/${enquiry.body.data.id}/status Into booked Using adminSession.accessToken
{
  "status": "booked_visit"
}
Then AssertStatus booked 200
And Assert booked.body.data.status == "booked_visit"
```
