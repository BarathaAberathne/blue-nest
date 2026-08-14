---
id: SUI-PORTAL-001
number: "2.34"
type: Test Suite
title: Parent Portal — child access, attendance, daily-log sharing & isolation
owner: QA
mode: Standalone
status: Active
tags:
  - portal
---

# Parent Portal suite

The consolidated parent-facing area (docs/portal/parent-portal-investigation.md):
parent resolution + authorised children, parent-safe attendance, and the
canonical daily-log sharing workflow — internal by default, explicit
Send-to-Parent (approved records only, safeguarding never), withdrawal,
sanitisation and cross-family isolation. Every read goes through the same
canonical services the staff CMS uses.

```bnrest
Setup
Call ../../utils/auth/AUTH-UTIL-001-login.bnrest.md With Json Into adminSession
{ "email": "admin@bluenest.uk", "password": "${secret:QA_ADMIN_PASSWORD}" }

Call ../../utils/branch/BRANCH-FIX-001-create-test-branch.bnrest.md With Json Into branch
{ "accessToken": "${adminSession.accessToken}" }

Call ../../utils/child/CHILD-UTIL-003-create-child-direct.bnrest.md With Json Into child
{ "accessToken": "${adminSession.accessToken}", "branchSlug": "${branch.slug}", "firstName": "QA-AUTOTEST", "lastName": "Portal-${random()}", "dob": "${today("-30m")}" }

Call ../../utils/child/CHILD-UTIL-003-create-child-direct.bnrest.md With Json Into otherChild
{ "accessToken": "${adminSession.accessToken}", "branchSlug": "${branch.slug}", "firstName": "QA-AUTOTEST", "lastName": "OtherFam-${random()}", "dob": "${today("-30m")}" }

# Portal parent for `child` (activated login).
Set portalSuffix = random()
Post /api/v1/admin/children/${child.id}/parents Into rel Using adminSession.accessToken
{ "parent": { "first_name": "QA-AUTOTEST", "last_name": "PortalPar-${portalSuffix}", "email": "qa-autotest-portalpar-${portalSuffix}@bluenest.test" }, "relationship": "mother", "portal_access": true }
AssertStatus rel 201

Post /api/v1/admin/parents/${rel.body.data.parent_id}/invite Into invite Using adminSession.accessToken
{ "temporary_days": 0 }
AssertStatus invite 200

Post /api/v1/auth/portal/activate Into activated
{ "parent_id": "${rel.body.data.parent_id}", "token": "${invite.body.data.token}", "password": "PortalSuite2026!" }
AssertStatus activated 200

Post /api/v1/auth/login Into parentLogin
{ "email": "qa-autotest-portalpar-${portalSuffix}@bluenest.test", "password": "PortalSuite2026!" }
AssertStatus parentLogin 200
Set parentToken = parentLogin.body.data.access_token

# A manager login (different user from admin) to approve + share logs.
Set mgrSuffix = random()
Call ../../utils/staff/STAFF-UTIL-001-create-staff.bnrest.md With Json Into mgr
{ "accessToken": "${adminSession.accessToken}", "firstName": "QA-AUTOTEST", "lastName": "PortalMgr", "email": "qa-autotest-portalmgr-${mgrSuffix}@bluenest.test", "branchSlug": "${branch.slug}", "jobTitle": "Branch Manager", "enableLogin": true, "loginRole": "branch_manager", "loginPassword": "PortalMgr2026!" }
Call ../../utils/auth/AUTH-UTIL-001-login.bnrest.md With Json Into mgrSession
{ "email": "qa-autotest-portalmgr-${mgrSuffix}@bluenest.test", "password": "PortalMgr2026!" }

Body
Call CatchError ../../cases/portal/PORTAL-TC-001-parent-resolution.bnrest.md
Call CatchError ../../cases/portal/PORTAL-TC-002-attendance-access.bnrest.md
Call CatchError ../../cases/portal/PORTAL-TC-003-daily-log-sharing.bnrest.md
Call CatchError ../../cases/portal/PORTAL-TC-004-sharing-guards.bnrest.md

Teardown
Delete /api/v1/admin/staff/${mgr.id} Using adminSession.accessToken
Delete /api/v1/admin/parent-relationships/${rel.body.data.id} Using adminSession.accessToken
Delete /api/v1/admin/parents/${rel.body.data.parent_id} Using adminSession.accessToken
Delete /api/v1/admin/children/${child.id} Using adminSession.accessToken
Delete /api/v1/admin/children/${otherChild.id} Using adminSession.accessToken
Call ../../utils/branch/BRANCH-FIX-002-archive-test-branch.bnrest.md With Json Into cleanup
{ "accessToken": "${adminSession.accessToken}", "slug": "${branch.slug}" }
```
