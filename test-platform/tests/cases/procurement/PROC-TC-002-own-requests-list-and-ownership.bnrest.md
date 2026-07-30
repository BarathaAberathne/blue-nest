---
id: PROC-TC-002
number: 2.6.2
type: Test Case
title: A staff member sees their own request in /order-requests/me, and cannot fetch another staff member's request directly
owner: QA
mode: Standalone
status: Active
tags:
  - procurement
dependsOn: []
uses:
  - STAFF-UTIL-001
  - AUTH-UTIL-001
fixtureScope: case
timeoutSeconds: 30
---

# Own requests listing and ownership

New coverage (`SUI-PROCUREMENT-001`). Reads the shared `adminSession`/
`staffSession`/`branch` suite fixtures — see `SUI-PROCUREMENT-001`.

```bnrest
Setup
Post /api/v1/order-requests Into mine Using staffSession.accessToken
{
  "branch_slug": "${branch.slug}",
  "items": [{"item_name": "QA-AUTOTEST Wipes", "supplier": "Amazon", "qty": 2}]
}
AssertStatus mine 201

Set otherSuffix = random()
Call ../../utils/staff/STAFF-UTIL-001-create-staff.bnrest.md With Json Into otherStaff
{
  "accessToken": "${adminSession.accessToken}",
  "firstName": "QA-AUTOTEST",
  "lastName": "OtherRequester",
  "email": "qa-autotest-otherrequester-${otherSuffix}@bluenest.test",
  "branchSlug": "${branch.slug}",
  "jobTitle": "",
  "enableLogin": true,
  "loginRole": "staff",
  "loginPassword": "OtherRequester2027!"
}
Call ../../utils/auth/AUTH-UTIL-001-login.bnrest.md With Json Into otherStaffSession
{
  "email": "qa-autotest-otherrequester-${otherSuffix}@bluenest.test",
  "password": "OtherRequester2027!"
}

Body
When Get /api/v1/order-requests/me Into own Using staffSession.accessToken
Then AssertStatus own 200
And AssertJson own "$.body.data[?(@.id=='${mine.body.data.id}')]" == 1

When Get /api/v1/order-requests/${mine.body.data.id} Into otherFetch Using otherStaffSession.accessToken
Then AssertStatus otherFetch 403

Teardown
Delete /api/v1/admin/staff/${otherStaff.id} Using adminSession.accessToken
Delete /api/v1/admin/users/${otherStaff.userId} Using adminSession.accessToken
```
