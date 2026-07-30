---
id: BLOG-TC-001
number: 2.1.1
type: Test Case
title: A published post appears in the public list; a draft post does not
owner: QA
mode: Standalone
status: Active
tags:
  - blog
  - golden-path
dependsOn: []
uses: []
fixtureScope: case
timeoutSeconds: 30
---

# Published vs. draft visibility

New coverage (`SUI-BLOG-001`, no legacy equivalent). Verified against
`internal/handler/blog.go`: the public list filters `{"published": true}`
only. Reads the shared `adminSession` suite fixture.

```bnrest
Given Post /api/v1/admin/blog/posts Into draft Using adminSession.accessToken
{
  "slug": "qa-autotest-draft-${random()}",
  "title": "QA-AUTOTEST Draft Post",
  "excerpt": "A draft",
  "body": "Draft body content",
  "author_name": "QA-AUTOTEST",
  "published": false
}
Then AssertStatus draft 201
And Assert draft.body.data.id != null

When Post /api/v1/admin/blog/posts Into published Using adminSession.accessToken
{
  "slug": "qa-autotest-published-${random()}",
  "title": "QA-AUTOTEST Published Post",
  "excerpt": "A published post",
  "body": "Published body content",
  "author_name": "QA-AUTOTEST",
  "published": true
}
Then AssertStatus published 201

When Get /api/v1/blog/posts Into publicList
Then AssertStatus publicList 200
And AssertJson publicList "$.body.data[?(@.slug=='${published.body.data.slug}')].length()" == 1
And AssertJson publicList "$.body.data[?(@.slug=='${draft.body.data.slug}')].length()" == 0

Teardown
Delete /api/v1/admin/blog/posts/${draft.body.data.id} Using adminSession.accessToken
Delete /api/v1/admin/blog/posts/${published.body.data.id} Using adminSession.accessToken
```
