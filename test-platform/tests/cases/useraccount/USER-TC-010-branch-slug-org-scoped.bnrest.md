---
id: USER-TC-010
number: 2.7.10
type: Test Case
title: Branch slugs are unique per organisation, not globally
owner: QA
mode: Standalone
status: Active
tags:
  - useraccount
  - tenancy
  - regression
dependsOn: []
uses: []
fixtureScope: case
timeoutSeconds: 40
---

# Branch slug uniqueness is org-scoped (tenancy regression lock)

Found live: the legacy `uniq_branch_slug` index (created pre-tenancy by
cmd/seedbranches) was globally unique, so a second organisation could never
create a branch with a slug any other tenant already used — the raw Mongo
E11000 leaked to the UI. The index is now compound `{org_id, slug}`
(`uniq_branch_slug_per_org`, ensured by the branch repository at boot). Two
orgs may each own the same slug; a duplicate within ONE org is still rejected
with a friendly message. Reads the shared `adminSession` fixture
(see `SUI-USERACCOUNT-001`).

```bnrest
Setup
Set slugSuffix = random()
# Uses the SEEDED platform operator — see USER-TC-009's note on the
# tenant-pinned platform_super_admin assignment guard.
Call ../../utils/auth/AUTH-UTIL-001-login.bnrest.md With Json Into platformSession10
{ "email": "platform@bluenest.uk", "password": "${secret:QA_ADMIN_PASSWORD}" }

Post /api/v1/admin/organisations Into org10 Using platformSession10.accessToken
{
  "slug": "qa-autotest-org10-${slugSuffix}",
  "name": "QA-AUTOTEST Org10 ${slugSuffix}",
  "admin_email": "qa-autotest-orgadmin10-${slugSuffix}@bluenest.test",
  "admin_password": "OrgAdmin2027!"
}
AssertStatus org10 201

Call ../../utils/auth/AUTH-UTIL-001-login.bnrest.md With Json Into orgAdmin10
{ "email": "qa-autotest-orgadmin10-${slugSuffix}@bluenest.test", "password": "OrgAdmin2027!" }

Body
# The default org (adminSession) claims the slug first.
When Post /api/v1/admin/branches Into first Using adminSession.accessToken
{ "slug": "qa-autotest-shared-${slugSuffix}", "name": "QA-AUTOTEST Shared Branch ${slugSuffix}", "contact": { "email": "qa@bluenest.test", "address": "1 Test Way" }, "admissions": { "age_range": "0-5" } }
Then AssertStatus first 201

# A DIFFERENT org can reuse the exact same slug — tenancy means no global lock.
When Post /api/v1/admin/branches Into second Using orgAdmin10.accessToken
{ "slug": "qa-autotest-shared-${slugSuffix}", "name": "QA-AUTOTEST Shared Branch ${slugSuffix}", "contact": { "email": "qa@bluenest.test", "address": "1 Test Way" }, "admissions": { "age_range": "0-5" } }
Then AssertStatus second 201

# Within ONE org the duplicate is still rejected, with the friendly message.
When Post /api/v1/admin/branches Into dupe Using orgAdmin10.accessToken
{ "slug": "qa-autotest-shared-${slugSuffix}", "name": "QA-AUTOTEST Shared Branch dupe ${slugSuffix}", "contact": { "email": "qa@bluenest.test", "address": "1 Test Way" }, "admissions": { "age_range": "0-5" } }
Then AssertStatus dupe 400
And Assert dupe.body.error == "a branch with that slug already exists"

Teardown
Post /api/v1/admin/branches/qa-autotest-shared-${slugSuffix}/archive Using adminSession.accessToken
Post /api/v1/admin/branches/qa-autotest-shared-${slugSuffix}/archive Using orgAdmin10.accessToken
```
