---
id: ENQUIRY-TC-006
number: 1.7.10
type: Test Case
title: Status New -> Contacted is a single, auditable transition
owner: QA
mode: Dependent
status: Active
tags:
  - enquiry
  - golden-path
dependsOn:
  - ENQUIRY-TC-005
uses:
  - ENQUIRY-UTIL-002
fixtureScope: case
timeoutSeconds: 30
---

# Status transition New -> Contacted

Replaces legacy `EnquiryRegistrationSuite.tc_enq_006_statusTransitionNewToContacted`.
Genuinely `dependsOn: [ENQUIRY-TC-005]` (same pipeline enquiry) — see
`ENQUIRY-TC-001`/`ENQUIRY-TC-004`. Re-fetches after the transition to
confirm it persisted (a refresh doesn't revert the status).

```bnrest
Given Call ../../utils/enquiry/ENQUIRY-UTIL-002-find-by-name.bnrest.md With Json Into found
{
  "accessToken": "${adminSession.accessToken}",
  "branchSlug": "${branch.slug}",
  "name": "QA-AUTOTEST-EnqPipeline-${enquirySuffix}"
}

When Patch /api/v1/admin/enquiries/${found.id}/status Into statusChange Using adminSession.accessToken
{
  "status": "contacted"
}
Then AssertStatus statusChange 200
And Assert statusChange.body.data.status == "contacted"

When Get /api/v1/admin/enquiries/${found.id} Into refetched Using adminSession.accessToken
Then Assert refetched.body.data.status == "contacted"
```
