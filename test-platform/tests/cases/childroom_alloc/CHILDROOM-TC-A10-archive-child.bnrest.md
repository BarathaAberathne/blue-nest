---
id: CHILDROOM-TC-A10
number: 2.9.10
type: Test Case
title: Archiving a leaving child sets status left + leave date and ends live placements
owner: QA
mode: Standalone
status: Active
tags:
  - childroom
  - regression
dependsOn: []
uses:
  - CHILD-UTIL-003
fixtureScope: case
timeoutSeconds: 40
---

# Archive (mark as left) frees the room

The child-profile archive action: status flips to `left`, `leave_date` is
recorded, and any LIVE room placement is ended (never deleted) so the room's
capacity frees up. A second archive is rejected. Self-contained child;
reuses the suite's `room` fixture for the placement.

```bnrest
Setup
Call ../../utils/child/CHILD-UTIL-003-create-child-direct.bnrest.md With Json Into archChild
{ "accessToken": "${adminSession.accessToken}", "branchSlug": "${branch.slug}", "firstName": "QA-AUTOTEST", "lastName": "Archive-${random()}", "dob": "${today("-30m")}" }

Body
Given Post /api/v1/admin/child-room-assignments Into placed Using adminSession.accessToken
{ "child_id": "${archChild.id}", "room_id": "${room.id}" }
Then AssertStatus placed 201

When Post /api/v1/admin/children/${archChild.id}/archive Into archived Using adminSession.accessToken
{ "leave_date": "${today("+2w")}" }
Then AssertStatus archived 200
And Assert archived.body.data.status == "left"
And Assert archived.body.data.leave_date == today("+2w")

# The live placement ended — no active rows remain for the child.
When Get /api/v1/admin/children/${archChild.id}/room-assignments Into rows Using adminSession.accessToken
Then AssertStatus rows 200
And AssertJson rows "$.body.data[?(@.status=='active')]" == 0

# Archiving an already-left child is rejected.
When Post /api/v1/admin/children/${archChild.id}/archive Into again Using adminSession.accessToken
{ "leave_date": "" }
Then AssertStatus again 400

# A malformed leave date on a fresh child is rejected too.
Set archSuffix2 = random()
Call ../../utils/child/CHILD-UTIL-003-create-child-direct.bnrest.md With Json Into archChildB
{ "accessToken": "${adminSession.accessToken}", "branchSlug": "${branch.slug}", "firstName": "QA-AUTOTEST", "lastName": "ArchiveB-${archSuffix2}", "dob": "${today("-30m")}" }

When Post /api/v1/admin/children/${archChildB.id}/archive Into badDate Using adminSession.accessToken
{ "leave_date": "31/12/2026" }
Then AssertStatus badDate 400

Teardown
Delete /api/v1/admin/children/${archChild.id} Using adminSession.accessToken
Delete /api/v1/admin/children/${archChildB.id} Using adminSession.accessToken
```
