---
id: BLOG-TC-005
number: 2.1.5
type: Test Case
title: Liking a post increments like_count, with no per-caller duplicate-like prevention (gap lock)
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

# Like increments with no dedup

New coverage (`SUI-BLOG-001`). `internal/handler/blog.go`'s `IncrementLike`
is a bare `$inc like_count` with no IP/cookie/session guard — a real,
currently-existing gap, not a fix target here: the same caller can like a
post repeatedly and inflate the count indefinitely. Reads the shared
`adminSession` suite fixture.

```bnrest
Given Post /api/v1/admin/blog/posts Into post Using adminSession.accessToken
{
  "slug": "qa-autotest-likeable-${random()}",
  "title": "QA-AUTOTEST Likeable Post",
  "excerpt": "Like me",
  "body": "Body",
  "author_name": "QA-AUTOTEST",
  "published": true
}
Then AssertStatus post 201
And Assert post.body.data.like_count == 0

When Post /api/v1/blog/posts/${post.body.data.slug}/like Into first
Then AssertStatus first 200
And Assert first.body.data.like_count == 1

When Post /api/v1/blog/posts/${post.body.data.slug}/like Into second
Then AssertStatus second 200
And Assert second.body.data.like_count == 2

Teardown
Delete /api/v1/admin/blog/posts/${post.body.data.id} Using adminSession.accessToken
```
