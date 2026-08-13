---
id: SUI-SENDROOM-001
number: "2.33"
type: Test Suite
title: SEND room provision & allocation — provision classification, mainstream + specialist placement, transfers, KPIs
owner: QA
mode: Standalone
status: Active
tags:
  - send
---

# SEND room provision & allocation suite

Room provision describes the ROOM; SEND status describes the CHILD; the
NORMAL ChildRoomAssignment connects them. Every allocation and transfer here
goes through the existing canonical endpoints (CHILDROOM-UTIL-001 and
/transfer-room) — there is no SEND-specific allocation path to test because
none exists. Duplicate-assignment and cross-branch-allocation rejections are
already locked by the childroom allocation suite and are NOT re-tested here.

```bnrest
Setup
Call ../../utils/auth/AUTH-UTIL-001-login.bnrest.md With Json Into adminSession
{ "email": "admin@bluenest.uk", "password": "${secret:QA_ADMIN_PASSWORD}" }

Call ../../utils/branch/BRANCH-FIX-001-create-test-branch.bnrest.md With Json Into branch
{ "accessToken": "${adminSession.accessToken}" }

# One mainstream + one SEND-dedicated room, one SEND child, one non-SEND child.
Call ../../utils/room/ROOM-UTIL-001-create-room.bnrest.md With Json Into mainstream
{ "accessToken": "${adminSession.accessToken}", "branchSlug": "${branch.slug}", "name": "QA-AUTOTEST Mainstream-${random()}", "ageRange": "2-4 years", "capacity": 8 }

Call ../../utils/send/SENDROOM-FIX-001-create-send-room.bnrest.md With Json Into sendRoom
{ "accessToken": "${adminSession.accessToken}", "branchSlug": "${branch.slug}", "name": "QA-AUTOTEST SendRoom-${random()}", "capacity": 6 }

Call ../../utils/child/CHILD-UTIL-003-create-child-direct.bnrest.md With Json Into sendChild
{ "accessToken": "${adminSession.accessToken}", "branchSlug": "${branch.slug}", "firstName": "QA-AUTOTEST", "lastName": "SendAlloc-${random()}", "dob": "${today("-36m")}" }

Call ../../utils/send/SEND-FIX-001-record-send-support.bnrest.md With Json Into profile
{ "accessToken": "${adminSession.accessToken}", "childId": "${sendChild.id}", "status": "sen_support", "summary": "Allocation suite fixture" }

Call ../../utils/child/CHILD-UTIL-003-create-child-direct.bnrest.md With Json Into plainChild
{ "accessToken": "${adminSession.accessToken}", "branchSlug": "${branch.slug}", "firstName": "QA-AUTOTEST", "lastName": "PlainAlloc-${random()}", "dob": "${today("-36m")}" }

Body
Call CatchError ../../cases/sendroom/SENDROOM-TC-001-provision-classification.bnrest.md
Call CatchError ../../cases/sendroom/SENDROOM-TC-002-send-child-mainstream.bnrest.md
Call CatchError ../../cases/sendroom/SENDROOM-TC-003-transfer-to-specialist.bnrest.md
Call CatchError ../../cases/sendroom/SENDROOM-TC-004-transfer-back-and-kpis.bnrest.md

Teardown
Delete /api/v1/admin/children/${sendChild.id} Using adminSession.accessToken
Delete /api/v1/admin/children/${plainChild.id} Using adminSession.accessToken
Call ../../utils/branch/BRANCH-FIX-002-archive-test-branch.bnrest.md With Json Into cleanup
{ "accessToken": "${adminSession.accessToken}", "slug": "${branch.slug}" }
```
