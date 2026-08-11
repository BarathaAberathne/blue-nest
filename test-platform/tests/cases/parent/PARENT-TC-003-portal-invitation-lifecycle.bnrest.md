---
id: PARENT-TC-003
number: 2.29.3
type: Test Case
title: Portal invitation lifecycle — flag prerequisite, activation, single-use token, customer login
owner: QA
mode: Standalone
status: Active
tags:
  - parent
  - security
  - regression
dependsOn: []
uses: []
fixtureScope: case
timeoutSeconds: 40
---

# Secure portal invitation

An invite requires at least one portal-access child link; activation sets the
password (min 8 chars enforced), flips the parent to temporary access, links
a customer login, and the token is strictly single-use.

```bnrest
Setup
Set p3Suffix = random()

Body
# Linked WITHOUT portal access → invite refused.
When Post /api/v1/admin/children/${child.id}/parents Into rel Using adminSession.accessToken
{ "parent": { "first_name": "QA-AUTOTEST", "last_name": "Inv-${p3Suffix}", "email": "qa-autotest-inv-${p3Suffix}@bluenest.test" }, "relationship": "guardian" }
Then AssertStatus rel 201

When Post /api/v1/admin/parents/${rel.body.data.parent_id}/invite Into early Using adminSession.accessToken
{ "temporary_days": 7 }
Then AssertStatus early 400

# Grant portal access, invite succeeds and returns the one-time token.
When Put /api/v1/admin/parent-relationships/${rel.body.data.id} Into flag Using adminSession.accessToken
{ "relationship": "guardian", "portal_access": true }
Then AssertStatus flag 200

When Post /api/v1/admin/parents/${rel.body.data.parent_id}/invite Into invite Using adminSession.accessToken
{ "temporary_days": 7 }
Then AssertStatus invite 200
And Assert invite.body.data.token != null

# A short password is rejected; a proper one activates temporary access.
When Post /api/v1/auth/portal/activate Into weak
{ "parent_id": "${rel.body.data.parent_id}", "token": "${invite.body.data.token}", "password": "short" }
Then AssertStatus weak 400

When Post /api/v1/auth/portal/activate Into activated
{ "parent_id": "${rel.body.data.parent_id}", "token": "${invite.body.data.token}", "password": "Portal-pass-2026" }
Then AssertStatus activated 200
And Assert activated.body.data.portal_state == "temporary"
And Assert activated.body.data.user_id != null

# The token is single-use.
When Post /api/v1/auth/portal/activate Into replay
{ "parent_id": "${rel.body.data.parent_id}", "token": "${invite.body.data.token}", "password": "Portal-pass-2026" }
Then AssertStatus replay 400

# The linked login authenticates as a customer (parent login endpoint —
# /admin/auth/login is management-only by design).
When Post /api/v1/auth/login Into parentLogin
{ "email": "qa-autotest-inv-${p3Suffix}@bluenest.test", "password": "Portal-pass-2026" }
Then AssertStatus parentLogin 200
And Assert parentLogin.body.data.access_token != null
And Assert parentLogin.body.data.user.role == "customer"

# Manager override: suspend, then restore to active — both persist.
When Post /api/v1/admin/parents/${rel.body.data.parent_id}/portal-state Into suspended Using adminSession.accessToken
{ "state": "suspended" }
Then AssertStatus suspended 200
And Assert suspended.body.data.portal_state == "suspended"

When Post /api/v1/admin/parents/${rel.body.data.parent_id}/portal-state Into restored Using adminSession.accessToken
{ "state": "active" }
Then AssertStatus restored 200
And Assert restored.body.data.portal_state == "active"

Teardown
Delete /api/v1/admin/parent-relationships/${rel.body.data.id} Using adminSession.accessToken
Delete /api/v1/admin/parents/${rel.body.data.parent_id} Using adminSession.accessToken
```
