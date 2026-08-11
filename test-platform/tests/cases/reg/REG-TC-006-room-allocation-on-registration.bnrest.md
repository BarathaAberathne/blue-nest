---
id: REG-TC-006
number: 1.5.7
type: Test Case
title: Registering with a room_id creates the canonical room assignment; a bad room_id never unwinds the registration
owner: QA
mode: Standalone
status: Active
tags:
  - registration
  - rooms
  - regression
dependsOn: []
uses:
  - ENQUIRY-UTIL-001
  - ROOM-UTIL-001
fixtureScope: case
timeoutSeconds: 40
---

# Room allocation on registration (canonical, best-effort)

The registration panel's room picker sends the room's id alongside the
display name; the backend allocates the newly-created child to that room via
the canonical child-room-assignment flow (start = expected start date). A
room that fails allocation must NOT unwind the already-confirmed
registration — the enquiry stays registered and the failure lands as a note.
Self-contained: creates its own enquiry + room.

```bnrest
Setup
Set reg006Suffix = random()
Call ../../utils/enquiry/ENQUIRY-UTIL-001-submit-enquiry.bnrest.md With Json Into regEnquiry
{
  "accessToken": "${adminSession.accessToken}",
  "branchSlug": "${branch.slug}",
  "name": "QA-AUTOTEST-Reg006Parent-${reg006Suffix}",
  "email": "qa-autotest-reg006-parent-${reg006Suffix}@bluenest.test",
  "phone": "07000000096",
  "enquiryType": "General enquiry",
  "source": "phone"
}

Call ../../utils/room/ROOM-UTIL-001-create-room.bnrest.md With Json Into regRoom
{
  "accessToken": "${adminSession.accessToken}",
  "branchSlug": "${branch.slug}",
  "name": "QA-AUTOTEST-Reg006-Room-${reg006Suffix}",
  "ageRange": "0-5",
  "capacity": 5
}

Body
When Post /api/v1/admin/enquiries/${regEnquiry.id}/register Into registered Using adminSession.accessToken
{
  "expected_start_date": "${today("+1m")}T00:00:00Z",
  "child_first_name": "QA-AUTOTEST-Reg006",
  "child_last_name": "Child-${reg006Suffix}",
  "child_dob": "${today("-2y")}",
  "room_allocation": "QA-AUTOTEST-Reg006-Room-${reg006Suffix}",
  "room_id": "${regRoom.id}"
}
Then AssertStatus registered 200
And Assert registered.body.data.status == "registered"

# The child exists and carries the canonical (scheduled — future start) room
# assignment. The child-list room_id projection only shows ACTIVE placements,
# so assert on the assignment history endpoint instead.
When Get /api/v1/admin/children Into kids Using adminSession.accessToken
Then AssertStatus kids 200
CopyJson kids "$.body.data[?(@.first_name=='QA-AUTOTEST-Reg006')]" Into regChild
Then Assert regChild.id != null

When Get /api/v1/admin/children/${regChild.id}/room-assignments Into placements Using adminSession.accessToken
Then AssertStatus placements 200
And AssertJson placements "$.body.data[?(@.room_id=='${regRoom.id}')]" == 1

# A register call with an unknown room id still succeeds (best-effort
# allocation, never unwinds the registration).
Set reg006bSuffix = random()
Call ../../utils/enquiry/ENQUIRY-UTIL-001-submit-enquiry.bnrest.md With Json Into regEnquiryB
{
  "accessToken": "${adminSession.accessToken}",
  "branchSlug": "${branch.slug}",
  "name": "QA-AUTOTEST-Reg006bParent-${reg006bSuffix}",
  "email": "qa-autotest-reg006b-parent-${reg006bSuffix}@bluenest.test",
  "phone": "07000000095",
  "enquiryType": "General enquiry",
  "source": "phone"
}

When Post /api/v1/admin/enquiries/${regEnquiryB.id}/register Into registeredB Using adminSession.accessToken
{
  "expected_start_date": "${today("+1m")}T00:00:00Z",
  "child_first_name": "QA-AUTOTEST-Reg006b",
  "child_last_name": "Child-${reg006bSuffix}",
  "child_dob": "${today("-2y")}",
  "room_id": "000000000000000000000000"
}
Then AssertStatus registeredB 200
And Assert registeredB.body.data.status == "registered"
```
