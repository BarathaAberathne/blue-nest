---
id: BLOG-TC-006
number: 2.1.6
type: Test Case
title: A posted comment is visible immediately, with no moderation/approval step
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

# Comment appears immediately

New coverage (`SUI-BLOG-001`). `internal/handler/comment.go` writes
straight through with no approval flag — the comment list a caller sees
right after posting includes their own comment already. Reads the shared
`adminSession` suite fixture.

```bnrest
Given Post /api/v1/admin/blog/posts Into post Using adminSession.accessToken
{
  "slug": "qa-autotest-commentable-${random()}",
  "title": "QA-AUTOTEST Commentable Post",
  "excerpt": "Comment on me",
  "body": "Body",
  "author_name": "QA-AUTOTEST",
  "published": true
}
Then AssertStatus post 201

When Post /api/v1/blog/posts/${post.body.data.slug}/comments Into comment
{
  "name": "QA-AUTOTEST Commenter",
  "body": "QA-AUTOTEST first comment"
}
Then AssertStatus comment 201

When Get /api/v1/blog/posts/${post.body.data.slug}/comments Into comments
Then AssertStatus comments 200
And AssertJson comments "$.body.data[?(@.body=='QA-AUTOTEST first comment')].length()" == 1

Teardown
Delete /api/v1/admin/blog/posts/${post.body.data.id} Using adminSession.accessToken
```
