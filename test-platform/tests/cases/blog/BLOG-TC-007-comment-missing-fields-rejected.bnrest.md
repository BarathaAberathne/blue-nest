---
id: BLOG-TC-007
number: 2.1.7
type: Test Case
title: A comment missing name or body is rejected with 400
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

# Comment missing required fields is rejected

New coverage (`SUI-BLOG-001`). Reads the shared `adminSession` suite
fixture.

```bnrest
Given Post /api/v1/admin/blog/posts Into post Using adminSession.accessToken
{
  "slug": "qa-autotest-commentvalidation-${random()}",
  "title": "QA-AUTOTEST Comment Validation Post",
  "excerpt": "e",
  "body": "b",
  "author_name": "QA-AUTOTEST",
  "published": true
}
Then AssertStatus post 201

When Post /api/v1/blog/posts/${post.body.data.slug}/comments Into missingBody
{
  "name": "QA-AUTOTEST Commenter"
}
Then AssertStatus missingBody 400

When Post /api/v1/blog/posts/${post.body.data.slug}/comments Into missingName
{
  "body": "QA-AUTOTEST a comment with no name"
}
Then AssertStatus missingName 400

Teardown
Delete /api/v1/admin/blog/posts/${post.body.data.id} Using adminSession.accessToken
```
