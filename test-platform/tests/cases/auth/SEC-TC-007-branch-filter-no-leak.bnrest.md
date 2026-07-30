---
id: SEC-TC-007
number: 1.1.13
type: Test Case
title: An explicit branch filter never returns another branch's records
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
fixtureScope: case
timeoutSeconds: 30
---

# Branch filter never leaks another branch's records

Replaces legacy `SecuritySuite.sec_007_branchFilterNeverLeaksOtherBranches`.
Uses the org-wide admin token, so this specifically checks the endpoint's
own filter is honest (the deeper "a branch-scoped role can't even REQUEST
another branch" check is `ROLE-TC-005`). Creates two dynamic branches with
one enquiry each so the leak check doesn't depend on real, pre-existing
Harrow/other-branch data.

```bnrest
Setup
Call ../../utils/auth/AUTH-UTIL-001-login.bnrest.md With Json Into adminSession
{
  "email": "admin@bluenest.uk",
  "password": "${secret:QA_ADMIN_PASSWORD}"
}

Call ../../utils/branch/BRANCH-FIX-001-create-test-branch.bnrest.md With Json Into branchA
{
  "accessToken": "${adminSession.accessToken}"
}

Call ../../utils/branch/BRANCH-FIX-001-create-test-branch.bnrest.md With Json Into branchB
{
  "accessToken": "${adminSession.accessToken}"
}

Post /api/v1/admin/enquiries Into enquiryA Using adminSession.accessToken
{
  "name": "QA-AUTOTEST-BranchLeakA-${random()}",
  "email": "qa-autotest-branchleak-a-${random()}@bluenest.test",
  "branch": "${branchA.slug}",
  "enquiry_type": "General enquiry"
}
AssertStatus enquiryA 201

Post /api/v1/admin/enquiries Into enquiryB Using adminSession.accessToken
{
  "name": "QA-AUTOTEST-BranchLeakB-${random()}",
  "email": "qa-autotest-branchleak-b-${random()}@bluenest.test",
  "branch": "${branchB.slug}",
  "enquiry_type": "General enquiry"
}
AssertStatus enquiryB 201

Body
When Get /api/v1/admin/enquiries?branch=${branchA.slug} Into filtered Using adminSession.accessToken
Then AssertStatus filtered 200
And AssertJson filtered "$.body.data[?(@.branch!='${branchA.slug}')].length()" == 0
And AssertJson filtered "$.body.data[?(@.id=='${enquiryA.body.data.id}')].length()" == 1

Teardown
Call ../../utils/branch/BRANCH-FIX-002-archive-test-branch.bnrest.md With Json Into cleanupA
{
  "accessToken": "${adminSession.accessToken}",
  "slug": "${branchA.slug}"
}
Call ../../utils/branch/BRANCH-FIX-002-archive-test-branch.bnrest.md With Json Into cleanupB
{
  "accessToken": "${adminSession.accessToken}",
  "slug": "${branchB.slug}"
}
```
