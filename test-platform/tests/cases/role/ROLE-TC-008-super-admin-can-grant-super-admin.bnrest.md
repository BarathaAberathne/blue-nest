---
id: ROLE-TC-008
number: 1.4.14
type: Test Case
title: super_admin itself CAN still grant super_admin (the fix blocks escalation, not legitimate work)
owner: QA
mode: Standalone
status: Active
tags:
  - role
dependsOn: []
uses:
  - STAFF-UTIL-001
fixtureScope: case
timeoutSeconds: 30
---

# super_admin can still legitimately grant super_admin

Replaces legacy `RoleSuite.tc_role_002f_superAdminCanStillGrantSuperAdmin` —
proves the privilege-escalation fix blocks a `staff.manage` holder
specifically, not legitimate admin work. Reads the shared `adminSession`
suite fixture — see `ROLE-TC-001`.

```bnrest
Call ../../utils/staff/STAFF-UTIL-001-create-staff.bnrest.md With Json Into granted
{
  "accessToken": "${adminSession.accessToken}",
  "firstName": "QA-AUTOTEST",
  "lastName": "Legit Grant",
  "email": "qa-autotest-legit-super-admin-grant-${random()}@bluenest.test",
  "branchSlug": "${branch.slug}",
  "jobTitle": "",
  "enableLogin": true,
  "loginRole": "super_admin",
  "loginPassword": "LegitGrant2026!"
}

Assert granted.id != null

Delete /api/v1/admin/staff/${granted.id} Using adminSession.accessToken
Delete /api/v1/admin/users/${granted.userId} Using adminSession.accessToken
```
