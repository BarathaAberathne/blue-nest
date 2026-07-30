---
id: SEC-TC-005
number: 1.1.11
type: Test Case
title: A regex-escaped search still finds real matches (the fix didn't break normal substring search)
owner: QA
mode: Standalone
status: Active
tags:
  - authentication
  - security
dependsOn: []
uses:
  - AUTH-UTIL-001
  - BRANCH-FIX-001
  - BRANCH-FIX-002
  - STAFF-UTIL-001
fixtureScope: case
timeoutSeconds: 30
---

# Escaped search still finds real matches

Replaces legacy `SecuritySuite.sec_005_escapedSearchStillFindsRealMatches`.
Creates its own dynamic branch + staff member (rather than relying on the
real Harrow branch having a name containing "a") so the search is
guaranteed to have at least one real match.

```bnrest
Setup
Call ../../utils/auth/AUTH-UTIL-001-login.bnrest.md With Json Into adminSession
{
  "email": "admin@bluenest.uk",
  "password": "${secret:QA_ADMIN_PASSWORD}"
}

Call ../../utils/branch/BRANCH-FIX-001-create-test-branch.bnrest.md With Json Into branch
{
  "accessToken": "${adminSession.accessToken}"
}

Call ../../utils/staff/STAFF-UTIL-001-create-staff.bnrest.md With Json Into staff
{
  "accessToken": "${adminSession.accessToken}",
  "firstName": "QA-AUTOTEST",
  "lastName": "SearchMatch-${random()}",
  "email": "qa-autotest-searchmatch-${random()}@bluenest.test",
  "branchSlug": "${branch.slug}",
  "jobTitle": "",
  "enableLogin": false,
  "loginRole": "",
  "loginPassword": ""
}

Body
When Get /api/v1/admin/staff?q=a&branch=${branch.slug} Into found Using adminSession.accessToken
Then AssertStatus found 200
And AssertJson found $.body.data.length() > 0

Teardown
Delete /api/v1/admin/staff/${staff.id} Using adminSession.accessToken
Call ../../utils/branch/BRANCH-FIX-002-archive-test-branch.bnrest.md With Json Into cleanup
{
  "accessToken": "${adminSession.accessToken}",
  "slug": "${branch.slug}"
}
```
