---
id: ENQUIRY-TC-003
number: 1.7.6
type: Test Case
title: Submitting the same enquiry twice merges into one record instead of creating a duplicate
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

# Duplicate submission merges (regression)

Replaces legacy `EnquiryRegistrationSuite.tc_enq_003_duplicateSubmissionMerges`.
Reads the shared `adminSession`/`branch` suite fixtures — see
`ENQUIRY-TC-001`. A second submission from the same email, while the first
is still in the open pipeline (status `new`), merges into the same record
(200, not 201) — the second message is preserved as a note rather than
lost.

```bnrest
Set dupSuffix = random()

Given Post /api/v1/admin/enquiries Into first Using adminSession.accessToken
{
  "name": "QA-AUTOTEST Duplicate Probe",
  "email": "qa-autotest-dupe-enquiry-${dupSuffix}@bluenest.test",
  "branch": "${branch.slug}",
  "enquiry_type": "General enquiry",
  "message": "First message"
}
Then AssertStatus first 201

When Post /api/v1/admin/enquiries Into second Using adminSession.accessToken
{
  "name": "QA-AUTOTEST Duplicate Probe",
  "email": "qa-autotest-dupe-enquiry-${dupSuffix}@bluenest.test",
  "branch": "${branch.slug}",
  "enquiry_type": "General enquiry",
  "message": "Second message - retried after a timeout"
}
Then AssertStatus second 200
And Assert second.body.data.id == first.body.data.id
And AssertJson second $.body.data.notes[0].note contains "Second message - retried after a timeout"

When Get /api/v1/admin/enquiries?branch=${branch.slug} Into list Using adminSession.accessToken
Then AssertJson list "$.body.data[?(@.email=='qa-autotest-dupe-enquiry-${dupSuffix}@bluenest.test')]" == 1
```
