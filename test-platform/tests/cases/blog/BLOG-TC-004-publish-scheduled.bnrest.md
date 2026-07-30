---
id: BLOG-TC-004
number: 2.1.4
type: Test Case
title: Triggering publish-scheduled flips a due scheduled post to published
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

# Publish-scheduled flips due posts

New coverage (`SUI-BLOG-001`). `internal/handler/admin/blog.go`'s
`TriggerPublishScheduled` flips any post where
`published:false AND scheduled_at <= now` to `published:true`, and returns
`{"published": <count>}`. Reads the shared `adminSession` suite fixture.

```bnrest
Given Post /api/v1/admin/blog/posts Into due Using adminSession.accessToken
{
  "slug": "qa-autotest-due-scheduled-${random()}",
  "title": "QA-AUTOTEST Due Scheduled Post",
  "excerpt": "Due",
  "body": "Body",
  "author_name": "QA-AUTOTEST",
  "published": false,
  "scheduled_at": "2020-01-01T00:00:00Z"
}
Then AssertStatus due 201

When Post /api/v1/admin/blog/publish-scheduled Into trigger Using adminSession.accessToken
Then AssertStatus trigger 200
And Assert trigger.body.data.published >= 1

When Get /api/v1/blog/posts/${due.body.data.slug} Into afterTrigger
Then AssertStatus afterTrigger 200
And Assert afterTrigger.body.data.published == true

Teardown
Delete /api/v1/admin/blog/posts/${due.body.data.id} Using adminSession.accessToken
```
