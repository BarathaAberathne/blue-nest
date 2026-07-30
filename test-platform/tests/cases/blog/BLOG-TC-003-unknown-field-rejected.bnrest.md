---
id: BLOG-TC-003
number: 2.1.3
type: Test Case
title: An unrecognised field in the post body is rejected with 400
owner: QA
mode: Standalone
status: Active
tags:
  - blog
dependsOn: []
uses: []
fixtureScope: case
timeoutSeconds: 30
---

# Unknown field is rejected

New coverage (`SUI-BLOG-001`). `validator.DecodeJSON`'s
`DisallowUnknownFields()` means any key the `BlogPost` struct doesn't
recognise is a clean 400, not silently dropped or a 500. Reads the shared
`adminSession` suite fixture.

```bnrest
Given Post /api/v1/admin/blog/posts Into rejected Using adminSession.accessToken
{
  "slug": "qa-autotest-unknown-field-${random()}",
  "title": "QA-AUTOTEST",
  "not_a_real_field": "surprise",
  "published": false
}
Then AssertStatus rejected 400
```
