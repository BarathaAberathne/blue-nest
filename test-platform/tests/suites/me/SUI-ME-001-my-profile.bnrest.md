---
id: SUI-ME-001
number: "2.24"
type: Test Suite
title: My Profile hub - self-service profile, attendance, rota
owner: QA
mode: Dependent
status: Active
tags:
  - me
dependsOn: []
uses: []
fixtureScope: suite
timeoutSeconds: 120
---

# My Profile self-service

Covers the signed-in user's own `/me/*` endpoints. Creates a staff member WITH
a linked login, signs in as them, then runs the profile view/self-edit +
attendance + rota reads.

```bnrest
Setup
Call ../../utils/auth/AUTH-UTIL-001-login.bnrest.md With Json Into adminSession
{
  "email": "admin@bluenest.uk",
  "password": "${secret:QA_ADMIN_PASSWORD}"
}

Call ../../utils/branch/BRANCH-FIX-001-create-test-branch.bnrest.md With Json Into branch
{ "accessToken": "${adminSession.accessToken}" }

Call ../../utils/staff/STAFF-UTIL-001-create-staff.bnrest.md With Json Into meStaff
{
  "accessToken": "${adminSession.accessToken}",
  "firstName": "QA-AUTOTEST",
  "lastName": "MeProfile-${random()}",
  "email": "qa-autotest-me-${random()}@bluenest.test",
  "branchSlug": "${branch.slug}",
  "jobTitle": "Nursery Practitioner",
  "enableLogin": true,
  "loginRole": "staff",
  "loginPassword": "QA-me-pass-123"
}

Call ../../utils/auth/AUTH-UTIL-001-login.bnrest.md With Json Into meSession
{ "email": "${meStaff.email}", "password": "QA-me-pass-123" }

Body
Call CatchError ../../cases/me/ME-TC-001-self-service-profile.bnrest.md
```
