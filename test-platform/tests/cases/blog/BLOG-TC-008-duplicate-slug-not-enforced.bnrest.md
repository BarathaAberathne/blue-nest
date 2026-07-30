---
id: BLOG-TC-008
number: 2.1.8
type: Test Case
title: Two posts can be created with the same slug — no uniqueness is enforced (gap lock)
owner: QA
mode: Standalone
status: Active
tags:
  - blog
  - regression
dependsOn: []
uses: []
fixtureScope: case
timeoutSeconds: 30
---

# Duplicate slug is not enforced

New coverage (`SUI-BLOG-001`), a documented gap: no unique index or
application-level check exists on `BlogPost.slug`
(`internal/repository/blog.go`'s `Create` is a bare insert). This is not
a fix target here — just a real, currently-existing
absence of validation, matching this codebase's "gap lock" convention.
Reads the shared `adminSession` suite fixture.

```bnrest
Given Post /api/v1/admin/blog/posts Into first Using adminSession.accessToken
{
  "slug": "qa-autotest-dup-slug-${random()}",
  "title": "QA-AUTOTEST First",
  "excerpt": "e1",
  "body": "b1",
  "author_name": "QA-AUTOTEST",
  "published": false
}
Then AssertStatus first 201

When Post /api/v1/admin/blog/posts Into second Using adminSession.accessToken
{
  "slug": "${first.body.data.slug}",
  "title": "QA-AUTOTEST Second",
  "excerpt": "e2",
  "body": "b2",
  "author_name": "QA-AUTOTEST",
  "published": false
}
Then AssertStatus second 201
And Assert second.body.data.id != first.body.data.id

Teardown
Delete /api/v1/admin/blog/posts/${first.body.data.id} Using adminSession.accessToken
Delete /api/v1/admin/blog/posts/${second.body.data.id} Using adminSession.accessToken
```
