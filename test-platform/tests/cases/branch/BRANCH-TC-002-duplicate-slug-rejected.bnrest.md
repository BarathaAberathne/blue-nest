---
id: BRANCH-TC-002
number: 1.2.3
type: Test Case
title: Creating a second branch with slug=harrow is rejected, no partial record created
owner: QA
mode: Standalone
status: Active
tags:
  - branch
  - regression
dependsOn: []
uses:
  - AUTH-UTIL-001
fixtureScope: case
timeoutSeconds: 30
---

# Duplicate slug is rejected, no partial record created

Replaces legacy `BranchSuite.tc_br_002_duplicateSlugRejected`. Instead of
comparing a raw total branch count before/after (fragile in a shared
environment where unrelated branches can appear over time), this asserts
the more targeted invariant the legacy test actually cared about: still
**exactly one** branch with `slug=harrow` afterwards — no duplicate/partial
record under that slug.

```bnrest
Given Call ../../utils/auth/AUTH-UTIL-001-login.bnrest.md With Json Into session
{
  "email": "admin@bluenest.uk",
  "password": "${secret:QA_ADMIN_PASSWORD}"
}

When Post /api/v1/admin/branches Into dup Using session.accessToken
{
  "name": "QA-AUTOTEST-Duplicate-Harrow-Attempt-${random()}",
  "slug": "harrow",
  "capacity": 60
}
Then AssertStatus dup 400
And AssertJson dup $.body.error contains "already exists"

When Get /api/v1/admin/branches Into allBranches Using session.accessToken
Then AssertJson allBranches $.body.data[?(@.slug=='harrow')] == 1
```
