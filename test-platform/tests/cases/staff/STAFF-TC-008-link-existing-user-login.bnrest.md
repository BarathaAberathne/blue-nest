---
id: STAFF-TC-008
number: 1.4.18
type: Test Case
title: Enabling a login links an EXISTING user account by email; a login owned by another staff member cannot be stolen
owner: QA
mode: Standalone
status: Active
tags: [staff, regression]
dependsOn: []
uses: [AUTH-UTIL-001, BRANCH-FIX-001, BRANCH-FIX-002]
fixtureScope: case
timeoutSeconds: 40
---

# Staff ↔ user linking

The mismatch scenario from the field: a user account exists (created on
/admin/users), the staff record is HR-only with no email. Enabling the login
with that email must LINK the existing account to the staff profile (no
duplicate, no password needed) — and a second staff member must never be able
to claim the same login.

```bnrest
Setup
Call ../../utils/auth/AUTH-UTIL-001-login.bnrest.md With Json Into session
{ "email": "admin@bluenest.uk", "password": "${secret:QA_ADMIN_PASSWORD}" }

Call ../../utils/branch/BRANCH-FIX-001-create-test-branch.bnrest.md With Json Into branch
{ "accessToken": "${session.accessToken}" }

Set linkSuffix = random()

# A standalone user account, created the way the mismatch arises.
Post /api/v1/admin/users Into user Using session.accessToken
{ "email": "qa-autotest-linkuser-${linkSuffix}@bluenest.test", "password": "LinkUser2026!", "first_name": "QA-AUTOTEST", "last_name": "LinkUser", "role": "deputy_manager" }
AssertStatus user 201

# An HR-only staff record with NO email and NO login.
Post /api/v1/admin/staff Into hrOnly Using session.accessToken
{ "first_name": "QA-AUTOTEST", "last_name": "HrOnly-${linkSuffix}", "branch_slug": "${branch.slug}" }
AssertStatus hrOnly 201

Body
# Without an email, enabling the login fails with the guidance message.
When Put /api/v1/admin/staff/${hrOnly.body.data.id} Into noEmail Using session.accessToken
{ "first_name": "QA-AUTOTEST", "last_name": "HrOnly-${linkSuffix}", "branch_slug": "${branch.slug}", "enable_login": true, "login_role": "deputy_manager" }
Then AssertStatus noEmail 400

# Supplying the EXISTING user's email links that account — no password needed.
When Put /api/v1/admin/staff/${hrOnly.body.data.id} Into linked Using session.accessToken
{ "first_name": "QA-AUTOTEST", "last_name": "HrOnly-${linkSuffix}", "branch_slug": "${branch.slug}", "email": "qa-autotest-linkuser-${linkSuffix}@bluenest.test", "enable_login": true, "login_role": "deputy_manager" }
Then AssertStatus linked 200
And AssertJson linked "$.body.data.user_id" == "${user.body.data.id}"

# That login now authenticates INTO this staff profile (self-service resolve).
When Post /api/v1/admin/auth/login Into linkedLogin
{ "email": "qa-autotest-linkuser-${linkSuffix}@bluenest.test", "password": "LinkUser2026!" }
Then AssertStatus linkedLogin 200

# A second staff member cannot claim the same login.
Post /api/v1/admin/staff Into rival Using session.accessToken
{ "first_name": "QA-AUTOTEST", "last_name": "Rival-${linkSuffix}", "branch_slug": "${branch.slug}" }
AssertStatus rival 201

When Put /api/v1/admin/staff/${rival.body.data.id} Into steal Using session.accessToken
{ "first_name": "QA-AUTOTEST", "last_name": "Rival-${linkSuffix}", "branch_slug": "${branch.slug}", "email": "qa-autotest-linkuser-${linkSuffix}@bluenest.test", "enable_login": true, "login_role": "staff" }
Then AssertStatus steal 400

Teardown
Delete /api/v1/admin/staff/${rival.body.data.id} Using session.accessToken
Delete /api/v1/admin/staff/${hrOnly.body.data.id} Using session.accessToken
Delete /api/v1/admin/users/${user.body.data.id} Using session.accessToken
Call ../../utils/branch/BRANCH-FIX-002-archive-test-branch.bnrest.md With Json Into cleanup
{ "accessToken": "${session.accessToken}", "slug": "${branch.slug}" }
```
