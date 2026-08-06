---
id: USER-TC-009
number: 2.7.9
type: Test Case
title: A newly-onboarded org has its built-in roles seeded so its Permission Builder is usable
owner: QA
mode: Standalone
status: Active
tags:
  - useraccount
  - roles
  - regression
dependsOn: []
uses: []
fixtureScope: case
timeoutSeconds: 40
---

# New-org role seeding (per-org custom roles)

Onboarding an org provisions its first super-admin AND seeds its built-in roles,
so the new tenant's Roles & Permissions builder is populated immediately (startup
seeding only covered orgs that existed then). Reads the shared `adminSession`
fixture (see `SUI-USERACCOUNT-001`).

```bnrest
Setup
Set opSuffix = random()
Post /api/v1/admin/users Into platformUser Using adminSession.accessToken
{
  "email": "qa-autotest-op7-${opSuffix}@bluenest.test",
  "password": "PlatformOp2027!",
  "first_name": "QA-AUTOTEST",
  "last_name": "PlatformOp7",
  "role": "platform_super_admin"
}
AssertStatus platformUser 201

Call ../../utils/auth/AUTH-UTIL-001-login.bnrest.md With Json Into platformSession
{ "email": "qa-autotest-op7-${opSuffix}@bluenest.test", "password": "PlatformOp2027!" }

Body
When Post /api/v1/admin/organisations Into created Using platformSession.accessToken
{
  "slug": "qa-autotest-org7-${opSuffix}",
  "name": "QA-AUTOTEST Org7 ${opSuffix}",
  "admin_email": "qa-autotest-orgadmin7-${opSuffix}@bluenest.test",
  "admin_password": "OrgAdmin2027!"
}
Then AssertStatus created 201

# The onboarded admin can sign in and their org's roles are seeded.
Call ../../utils/auth/AUTH-UTIL-001-login.bnrest.md With Json Into orgAdmin
{ "email": "qa-autotest-orgadmin7-${opSuffix}@bluenest.test", "password": "OrgAdmin2027!" }

When Get /api/v1/admin/roles Into roles Using orgAdmin.accessToken
Then AssertStatus roles 200
And AssertJson roles "$.body.data.roles[?(@.name=='branch_manager')]" == 1
And AssertJson roles "$.body.data.roles[?(@.name=='super_admin')]" == 1

Teardown
Delete /api/v1/admin/users/${platformUser.body.data.id} Using adminSession.accessToken
