---
id: SUI-BLOG-001
number: "2.1"
type: Test Suite
title: Blog
owner: QA
mode: Standalone
status: Active
tags:
  - blog
---

# Blog suite

New coverage (no legacy equivalent — the legacy suite never touched the
Store/Blog/Kiosk/Procurement/Shifts/Audit/UserAccount modules). Verified
against `internal/models/blog.go`, `internal/handler/blog.go`,
`internal/handler/comment.go`, `internal/handler/admin/blog.go`. `Setup`
creates one admin login shared by every case; each case creates and tears
down its own post(s). Image upload (`POST /admin/uploads/image`) is not
covered — it needs a real multipart file body, which this engine's REST
commands don't support (JSON bodies only); documented here as a real
platform-capability gap, not silently skipped.

```bnrest
Setup
Call ../../utils/auth/AUTH-UTIL-001-login.bnrest.md With Json Into adminSession
{
  "email": "admin@bluenest.uk",
  "password": "${secret:QA_ADMIN_PASSWORD}"
}

Body
Call CatchError ../../cases/blog/BLOG-TC-001-create-and-list-published-only.bnrest.md
Call CatchError ../../cases/blog/BLOG-TC-002-unpublished-slug-404.bnrest.md
Call CatchError ../../cases/blog/BLOG-TC-003-unknown-field-rejected.bnrest.md
Call CatchError ../../cases/blog/BLOG-TC-004-publish-scheduled.bnrest.md
Call CatchError ../../cases/blog/BLOG-TC-005-like-increments-no-dedup.bnrest.md
Call CatchError ../../cases/blog/BLOG-TC-006-comment-posted-visible-immediately.bnrest.md
Call CatchError ../../cases/blog/BLOG-TC-007-comment-missing-fields-rejected.bnrest.md
Call CatchError ../../cases/blog/BLOG-TC-008-duplicate-slug-not-enforced.bnrest.md
```
