---
id: STAFFROOM-TC-004
number: 2.8.4
type: Test Case
title: An inactive staff member cannot receive a new room allocation
owner: QA
mode: Standalone
status: Active
tags:
  - staffroom
  - regression
dependsOn: []
uses: []
fixtureScope: case
timeoutSeconds: 30
---

# Inactive staff allocation rejected

New coverage (`SUI-STAFFROOM-001`). Creates a throwaway inactive staff
member. Reads shared `adminSession`/`room`/`branch` fixtures.

```bnrest
Setup
Post /api/v1/admin/staff Into leaver Using adminSession.accessToken
{
  "first_name": "QA-AUTOTEST",
  "last_name": "Leaver-${random()}",
  "branch_slug": "${branch.slug}",
  "status": "inactive"
}
AssertStatus leaver 201

Body
When Post /api/v1/admin/staff-room-assignments Into rejected Using adminSession.accessToken
{ "staff_id": "${leaver.body.data.id}", "room_id": "${room.id}" }
Then AssertStatus rejected 400

Teardown
Delete /api/v1/admin/staff/${leaver.body.data.id} Using adminSession.accessToken
