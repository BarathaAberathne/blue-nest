---
id: BRANCH-FIX-001
number: U.5
type: Test Util
title: Create an active test branch (dynamic fixture)
owner: QA Platform
mode: Standalone
status: Active
tags:
  - branch
  - fixture
fixtureScope: case
timeoutSeconds: 30
---

# Create an active test branch

A **fixture** — creates isolated, throwaway state rather than testing
behaviour itself (see `docs/testing/test-platform-architecture.md`'s
"Generic functional architecture" — `-FIX-` ids are Test Utils used
specifically for setup/cleanup, not a separate script type). Callers pass
only a super_admin `accessToken`; the branch name/slug are generated
uniquely so parallel/repeated runs never collide.

**Known limitation (accepted, see the same architecture doc section):**
this backend has no branch hard-delete — `BRANCH-FIX-002` only archives
(soft-flag, hidden from normal UI lists, but the row and anything created
under its slug are permanent). Every generated branch and any enquiry
created under it is real, permanent data.

```bnrest
Post /api/v1/admin/branches Into created Using input.accessToken
{
  "name": "QA-AUTOTEST-Automation-Branch-${random()}",
  "capacity": 50
}

AssertStatus created 201
Assert created.body.data.id != null
Assert created.body.data.slug != null

Output
{
  "id": "${created.body.data.id}",
  "slug": "${created.body.data.slug}",
  "name": "${created.body.data.name}"
}
```
