---
id: ENQUIRY-TC-005
number: 1.7.9
type: Test Case
title: An internal note is added, author and timestamp are recorded
owner: QA
mode: Dependent
status: Active
tags:
  - enquiry
dependsOn:
  - ENQUIRY-TC-004
uses:
  - ENQUIRY-UTIL-002
fixtureScope: case
timeoutSeconds: 30
---

# Internal note records author and timestamp

Replaces legacy
`EnquiryRegistrationSuite.tc_enq_005_addNoteRecordsAuthorAndTimestamp`.
Genuinely `dependsOn: [ENQUIRY-TC-004]` (same pipeline enquiry) — see
`ENQUIRY-TC-001`/`ENQUIRY-TC-004`.

```bnrest
Given Call ../../utils/enquiry/ENQUIRY-UTIL-002-find-by-name.bnrest.md With Json Into found
{
  "accessToken": "${adminSession.accessToken}",
  "branchSlug": "${branch.slug}",
  "name": "QA-AUTOTEST-EnqPipeline-${enquirySuffix}"
}

When Post /api/v1/admin/enquiries/${found.id}/notes Into noteAdded Using adminSession.accessToken
{
  "note": "QA-AUTOTEST note — golden path in progress."
}
Then AssertStatus noteAdded 200
And AssertJson noteAdded $.body.data.notes[0].note contains "QA-AUTOTEST"
And Assert noteAdded.body.data.notes[0].author_name != null
And Assert noteAdded.body.data.notes[0].created_at != null
```
