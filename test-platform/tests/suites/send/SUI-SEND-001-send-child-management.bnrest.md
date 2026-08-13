---
id: SUI-SEND-001
number: "2.32"
type: Test Suite
title: SEND child management — profile, status lifecycle, permissions, audit
owner: QA
mode: Standalone
status: Active
tags:
  - send
---

# SEND child management suite

The SEND/additional-support profile on the canonical Child record
(docs/send/send-management-design.md): record/update/end the status, existing
non-SEND children unaffected, sensitive data behind send.manage (practitioner
403 / SENCO 200), cross-branch rejection, and the audit trail. Generic and
branch-independent — every fixture is a throwaway created here.

```bnrest
Setup
Call ../../utils/auth/AUTH-UTIL-001-login.bnrest.md With Json Into adminSession
{ "email": "admin@bluenest.uk", "password": "${secret:QA_ADMIN_PASSWORD}" }

Call ../../utils/branch/BRANCH-FIX-001-create-test-branch.bnrest.md With Json Into branch
{ "accessToken": "${adminSession.accessToken}" }

Call ../../utils/branch/BRANCH-FIX-001-create-test-branch.bnrest.md With Json Into branchB
{ "accessToken": "${adminSession.accessToken}" }

Call ../../utils/child/CHILD-UTIL-003-create-child-direct.bnrest.md With Json Into child
{ "accessToken": "${adminSession.accessToken}", "branchSlug": "${branch.slug}", "firstName": "QA-AUTOTEST", "lastName": "Send-${random()}", "dob": "${today("-30m")}" }

# A practitioner in the branch (children.manage but NOT send.manage) and a
# SENCO (has send.manage) — proving the permission split.
Set pracSuffix = random()
Call ../../utils/staff/STAFF-UTIL-001-create-staff.bnrest.md With Json Into prac
{ "accessToken": "${adminSession.accessToken}", "firstName": "QA-AUTOTEST", "lastName": "Practitioner", "email": "qa-autotest-send-prac-${pracSuffix}@bluenest.test", "branchSlug": "${branch.slug}", "jobTitle": "Practitioner", "enableLogin": true, "loginRole": "practitioner", "loginPassword": "SendPrac2026!" }
Call ../../utils/auth/AUTH-UTIL-001-login.bnrest.md With Json Into pracSession
{ "email": "qa-autotest-send-prac-${pracSuffix}@bluenest.test", "password": "SendPrac2026!" }

Set sencoSuffix = random()
Call ../../utils/staff/STAFF-UTIL-001-create-staff.bnrest.md With Json Into senco
{ "accessToken": "${adminSession.accessToken}", "firstName": "QA-AUTOTEST", "lastName": "Senco", "email": "qa-autotest-send-senco-${sencoSuffix}@bluenest.test", "branchSlug": "${branch.slug}", "jobTitle": "SENCO", "enableLogin": true, "loginRole": "senco", "loginPassword": "SendSenco2026!" }
Call ../../utils/auth/AUTH-UTIL-001-login.bnrest.md With Json Into sencoSession
{ "email": "qa-autotest-send-senco-${sencoSuffix}@bluenest.test", "password": "SendSenco2026!" }

# A branch manager scoped to branchB only — cross-branch rejection.
Set bmgrSuffix = random()
Call ../../utils/staff/STAFF-UTIL-001-create-staff.bnrest.md With Json Into otherMgr
{ "accessToken": "${adminSession.accessToken}", "firstName": "QA-AUTOTEST", "lastName": "OtherMgr", "email": "qa-autotest-send-omgr-${bmgrSuffix}@bluenest.test", "branchSlug": "${branchB.slug}", "jobTitle": "Branch Manager", "enableLogin": true, "loginRole": "branch_manager", "loginPassword": "SendOtherMgr2026!" }
Call ../../utils/auth/AUTH-UTIL-001-login.bnrest.md With Json Into otherMgrSession
{ "email": "qa-autotest-send-omgr-${bmgrSuffix}@bluenest.test", "password": "SendOtherMgr2026!" }

Body
Call CatchError ../../cases/send/SEND-TC-001-record-send-status.bnrest.md
Call CatchError ../../cases/send/SEND-TC-002-update-and-audit.bnrest.md
Call CatchError ../../cases/send/SEND-TC-003-end-send-support.bnrest.md
Call CatchError ../../cases/send/SEND-TC-004-non-send-children-unaffected.bnrest.md
Call CatchError ../../cases/send/SEND-TC-005-permissions.bnrest.md
Call CatchError ../../cases/send/SEND-TC-006-cross-branch-rejected.bnrest.md

Teardown
Delete /api/v1/admin/staff/${prac.id} Using adminSession.accessToken
Delete /api/v1/admin/staff/${senco.id} Using adminSession.accessToken
Delete /api/v1/admin/staff/${otherMgr.id} Using adminSession.accessToken
Delete /api/v1/admin/children/${child.id} Using adminSession.accessToken
Call ../../utils/branch/BRANCH-FIX-002-archive-test-branch.bnrest.md With Json Into cleanupA
{ "accessToken": "${adminSession.accessToken}", "slug": "${branch.slug}" }
Call ../../utils/branch/BRANCH-FIX-002-archive-test-branch.bnrest.md With Json Into cleanupB
{ "accessToken": "${adminSession.accessToken}", "slug": "${branchB.slug}" }
```
