---
id: ENQUIRY-UTIL-002
number: U.13
type: Test Util
title: Find an enquiry in a branch by its exact name
owner: QA Platform
mode: Standalone
status: Active
tags:
  - enquiry
fixtureScope: case
timeoutSeconds: 30
---

# Find an enquiry by exact name

`GET /admin/enquiries` has no server-side free-text search (confirmed
against `parseEnquiryFilter`/`buildFilter` — only `branch`/`type`/`status`/
`assigned_to`/`from`/`to`, the admin UI itself filters client-side). This
finds a specific enquiry within a branch by an exact name match instead —
reliable here because every caller uses its own throwaway branch
(`BRANCH-FIX-001`), so the branch's own enquiry list is always small and
under this suite's control.

Inputs: `input.accessToken`, `input.branchSlug`, `input.name`.

```bnrest
Get /api/v1/admin/enquiries?branch=${input.branchSlug} Into result Using input.accessToken
AssertStatus result 200

CopyJson result "$.body.data[?(@.name=='${input.name}')]" Into found
Assert found.id != null

Output found
```
