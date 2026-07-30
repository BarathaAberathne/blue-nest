---
id: ENQUIRY-TC-001
number: 1.7.1
type: Test Case
title: A new enquiry is created exactly once, status New, linked to its branch
owner: QA
mode: Standalone
status: Active
tags:
  - enquiry
  - golden-path
dependsOn: []
uses: []
fixtureScope: case
timeoutSeconds: 30
---

# Enquiry is created exactly once

Replaces legacy `EnquiryRegistrationSuite.tc_enq_001_createsEnquiryOnce`.
Reads the shared `adminSession`/`branch`/`enquirySuffix` suite fixtures —
see `SUI-ENQUIRY-001`. Runs **first** — `ENQUIRY-TC-004`/`005`/`006`
depend on this enquiry existing (rediscovered by name via
`ENQUIRY-UTIL-002`, not a passed-down id — case-to-case variables don't
share scope in this engine, only suite `Setup` ones do).

```bnrest
Given Post /api/v1/admin/enquiries Into created Using adminSession.accessToken
{
  "name": "QA-AUTOTEST-EnqPipeline-${enquirySuffix}",
  "email": "qa-autotest-enq-pipeline-${enquirySuffix}@bluenest.test",
  "phone": "07000000001",
  "branch": "${branch.slug}",
  "child_age": "Under 1 year",
  "enquiry_type": "General enquiry",
  "source": "phone"
}
Then AssertStatus created 201
And Assert created.body.data.status == "new"
And Assert created.body.data.branch == branch.slug
```
