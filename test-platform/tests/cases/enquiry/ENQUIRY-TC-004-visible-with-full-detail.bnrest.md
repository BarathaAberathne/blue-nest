---
id: ENQUIRY-TC-004
number: 1.7.8
type: Test Case
title: The enquiry is visible with complete parent/child information
owner: QA
mode: Dependent
status: Active
tags:
  - enquiry
dependsOn:
  - ENQUIRY-TC-001
uses:
  - ENQUIRY-UTIL-002
fixtureScope: case
timeoutSeconds: 30
---

# Enquiry is visible with full detail

Replaces legacy `EnquiryRegistrationSuite.tc_enq_004_enquiryVisibleWithFullDetail`.
Genuinely `dependsOn: [ENQUIRY-TC-001]` — rediscovers the enquiry created
there by its deterministic name (`ENQUIRY-UTIL-002`) rather than a passed
id, since case-to-case variables aren't shared in this engine (only suite
`Setup` ones are) — see `ENQUIRY-TC-001`.

```bnrest
Given Call ../../utils/enquiry/ENQUIRY-UTIL-002-find-by-name.bnrest.md With Json Into found
{
  "accessToken": "${adminSession.accessToken}",
  "branchSlug": "${branch.slug}",
  "name": "QA-AUTOTEST-EnqPipeline-${enquirySuffix}"
}

When Get /api/v1/admin/enquiries/${found.id} Into fetched Using adminSession.accessToken
Then AssertStatus fetched 200
And Assert fetched.body.data.branch == branch.slug
And Assert fetched.body.data.name == found.name
And Assert fetched.body.data.email != null
```
