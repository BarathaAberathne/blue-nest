---
id: CHILDROOM-TC-EXIT6
number: 1.9.9
type: Test Case
title: A second child with the same name and date of birth at the same branch is rejected, not silently duplicated
owner: QA
mode: Standalone
status: Active
tags:
  - childroom
  - regression
dependsOn: []
uses: []
fixtureScope: case
timeoutSeconds: 30
---

# Duplicate child (direct create) is rejected

Replaces legacy `ChildRoomSuite.tc_exitcriteria_duplicateChildRejected` —
a regression lock on `childService.duplicateChild` for the **direct**
`POST /admin/children` path (distinct from `REG-TC-003`'s idempotency lock
on the enquiry-linked `EnsureFromEnquiry` path). Reads the shared
`adminSession`/`branch` suite fixtures — see `SUI-NET-001`.

```bnrest
Set dupSuffix = random()

Given Post /api/v1/admin/children Into first Using adminSession.accessToken
{
  "first_name": "QA-AUTOTEST",
  "last_name": "DupeChild-${dupSuffix}",
  "dob": "${today("-3y")}",
  "branch_slug": "${branch.slug}"
}
Then AssertStatus first 201

When Post /api/v1/admin/children Into rejected Using adminSession.accessToken
{
  "first_name": "QA-AUTOTEST",
  "last_name": "DupeChild-${dupSuffix}",
  "dob": "${today("-3y")}",
  "branch_slug": "${branch.slug}"
}
Then AssertStatus rejected 400
And AssertJson rejected $.body.error contains "already exists"

When Post /api/v1/admin/children Into different Using adminSession.accessToken
{
  "first_name": "QA-AUTOTEST",
  "last_name": "DupeChild-${dupSuffix}",
  "dob": "${today("-30m")}",
  "branch_slug": "${branch.slug}"
}
Then AssertStatus different 201

Teardown
Delete /api/v1/admin/children/${first.body.data.id} Using adminSession.accessToken
Delete /api/v1/admin/children/${different.body.data.id} Using adminSession.accessToken
```
