---
id: ROLE-TC-009
number: 1.4.15
type: Test Case
title: A role change revokes the user's existing sessions immediately
owner: QA
mode: Standalone
status: Active
tags:
  - role
  - regression
dependsOn: []
uses: []
fixtureScope: case
timeoutSeconds: 30
---

# Role change ends existing sessions (token-version revocation)

**Policy updated by the auth-hardening pass (audit item 5).** This case
originally locked the OLD behaviour — "an already-issued token keeps its old
role's permissions until refreshed" — which was exactly the vulnerability the
audit called out: role and branch scope live in the JWT claims, so a demoted
user kept their old powers until token expiry. Role/branch changes now bump
the user's token version (`authService.UpdateUser` → `revokeTokens`; the
staff PUT routes through it via `staffService`), and `middleware.Auth`
rejects the stale token on the very next request.

Reads the shared `deputySession`/`adminSession`/`deputy` suite fixtures —
see `ROLE-TC-001`. **Downgrades the shared deputy's role to `staff`** —
must run AFTER every other Role case that needs the deputy to still hold
`deputy_manager` (enforced by this suite's `Call` order, see
`SUI-STAFF-001`), and `ROLE-TC-010` (fresh login reflects the new role)
depends on this having run.

```bnrest
Given Get /api/v1/admin/enquiries?branch=${branch.slug} Into beforeDowngrade Using deputySession.accessToken
Then AssertStatus beforeDowngrade 200

When Put /api/v1/admin/staff/${deputy.id} Into downgrade Using adminSession.accessToken
{
  "first_name": "QA-AUTOTEST",
  "last_name": "Role Deputy",
  "email": "${deputy.email}",
  "branch_slug": "${branch.slug}",
  "enable_login": true,
  "login_role": "staff",
  "login_password": "RoleSuiteDeputy2026!"
}
Then AssertStatus downgrade 200

When Get /api/v1/admin/enquiries?branch=${branch.slug} Into afterDowngrade Using deputySession.accessToken
Then AssertStatus afterDowngrade 401
And AssertJson afterDowngrade $.body.error contains "revoked"
```
