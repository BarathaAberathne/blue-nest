---
id: ENQUIRY-UTIL-001
number: U.7
type: Test Util
title: Submit an admissions enquiry
owner: QA Platform
mode: Standalone
status: Active
tags:
  - enquiry
fixtureScope: case
timeoutSeconds: 30
---

# Submit an admissions enquiry

The one authoritative enquiry-creation implementation (`POST
/admin/enquiries`, the admin-side create — not the public `/contact` form,
which isn't a scope concern for these API-level tests). Registration
(`CHILD-UTIL-001`) requires an existing enquiry to register, so this is its
usual prerequisite.

Inputs: `input.accessToken`, `input.branchSlug`, `input.name`,
`input.email`, `input.phone`, `input.enquiryType`, `input.source`.

```bnrest
Post /api/v1/admin/enquiries Into created Using input.accessToken
{
  "name": "${input.name}",
  "email": "${input.email}",
  "phone": "${input.phone}",
  "branch": "${input.branchSlug}",
  "enquiry_type": "${input.enquiryType}",
  "source": "${input.source}"
}

AssertStatus created 201
Assert created.body.data.id != null

Output
{
  "id": "${created.body.data.id}",
  "name": "${created.body.data.name}",
  "email": "${created.body.data.email}",
  "branchSlug": "${input.branchSlug}"
}
```
