---
id: PARENT-TC-004
number: 2.29.4
type: Test Case
title: Portal scoping — a parent sees only their own children; other ids 404; management endpoints refused
owner: QA
mode: Standalone
status: Active
tags:
  - parent
  - security
  - regression
dependsOn: []
uses:
  - CHILD-UTIL-003
fixtureScope: case
timeoutSeconds: 40
---

# Parent-to-child authorisation (IDOR lock)

Activates a portal parent linked to ONE child, then proves: /portal/children
returns exactly that child; fetching an unrelated child's id by URL returns
404 (never the record, never a 403 that confirms existence); and the parent
token is refused by an admin endpoint.

```bnrest
Setup
Set p4Suffix = random()
Call ../../utils/child/CHILD-UTIL-003-create-child-direct.bnrest.md With Json Into otherChild
{ "accessToken": "${adminSession.accessToken}", "branchSlug": "${branch.slug}", "firstName": "QA-AUTOTEST", "lastName": "Other-${p4Suffix}", "dob": "${today("-24m")}" }

Body
When Post /api/v1/admin/children/${child.id}/parents Into rel Using adminSession.accessToken
{ "parent": { "first_name": "QA-AUTOTEST", "last_name": "Idor-${p4Suffix}", "email": "qa-autotest-idor-${p4Suffix}@bluenest.test" }, "relationship": "mother", "portal_access": true }
Then AssertStatus rel 201

When Post /api/v1/admin/parents/${rel.body.data.parent_id}/invite Into invite Using adminSession.accessToken
{ "temporary_days": 7 }
Then AssertStatus invite 200

When Post /api/v1/auth/portal/activate Into activated
{ "parent_id": "${rel.body.data.parent_id}", "token": "${invite.body.data.token}", "password": "Portal-pass-2026" }
Then AssertStatus activated 200

When Post /api/v1/auth/login Into parentLogin
{ "email": "qa-autotest-idor-${p4Suffix}@bluenest.test", "password": "Portal-pass-2026" }
Then AssertStatus parentLogin 200

# The portal lists exactly the authorised child.
When Get /api/v1/portal/children Into mine Using parentLogin.body.data.access_token
Then AssertStatus mine 200
And AssertJson mine "$.body.data[?(@.id=='${child.id}')]" == 1
And AssertJson mine "$.body.data[?(@.id=='${otherChild.id}')]" == 0

# Fetching the authorised child by id works; an unrelated child 404s.
When Get /api/v1/portal/children/${child.id} Into own Using parentLogin.body.data.access_token
Then AssertStatus own 200

When Get /api/v1/portal/children/${otherChild.id} Into foreign Using parentLogin.body.data.access_token
Then AssertStatus foreign 404

# The parent token is refused by management endpoints.
When Get /api/v1/admin/children Into adminRefused Using parentLogin.body.data.access_token
Then AssertStatus adminRefused 403

Teardown
Delete /api/v1/admin/parent-relationships/${rel.body.data.id} Using adminSession.accessToken
Delete /api/v1/admin/parents/${rel.body.data.parent_id} Using adminSession.accessToken
Delete /api/v1/admin/children/${otherChild.id} Using adminSession.accessToken
```
