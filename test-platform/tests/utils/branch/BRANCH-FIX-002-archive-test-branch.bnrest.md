---
id: BRANCH-FIX-002
number: U.6
type: Test Util
title: Archive (deactivate) a test branch
owner: QA Platform
mode: Standalone
status: Active
tags:
  - branch
  - fixture
fixtureScope: case
timeoutSeconds: 30
---

# Archive a test branch

Cleanup counterpart to `BRANCH-FIX-001`. Archiving is the only cleanup
primitive this backend has for branches (no hard-delete) — it correctly
hides the branch from every normal admin/public list
(`FindAll`/`FindAllAdmin` both filter `archived_at: {$exists: false}`), but
the row itself is permanent.

```bnrest
Post /api/v1/admin/branches/${input.slug}/archive Into archived Using input.accessToken

AssertStatus archived 204

Output
{
  "archived": true
}
```
