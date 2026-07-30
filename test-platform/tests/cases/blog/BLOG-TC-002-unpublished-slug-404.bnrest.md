---
id: BLOG-TC-002
number: 2.1.2
type: Test Case
title: Fetching an unpublished post by slug (or a nonexistent slug) is a clean 404
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

# Unpublished/nonexistent slug is a 404

New coverage (`SUI-BLOG-001`). `internal/handler/blog.go`'s `FindBySlug`
filters `{"slug": slug, "published": true}` — an unpublished post's own
slug returns exactly the same 404 as a slug that never existed at all.
Reads the shared `adminSession` suite fixture.

```bnrest
Given Post /api/v1/admin/blog/posts Into draft Using adminSession.accessToken
{
  "slug": "qa-autotest-hidden-${random()}",
  "title": "QA-AUTOTEST Hidden Draft",
  "excerpt": "Hidden",
  "body": "Hidden body",
  "author_name": "QA-AUTOTEST",
  "published": false
}
Then AssertStatus draft 201

When Get /api/v1/blog/posts/${draft.body.data.slug} Into hiddenLookup
Then AssertStatus hiddenLookup 404

When Get /api/v1/blog/posts/qa-autotest-never-existed-${random()} Into missingLookup
Then AssertStatus missingLookup 404

Teardown
Delete /api/v1/admin/blog/posts/${draft.body.data.id} Using adminSession.accessToken
```
