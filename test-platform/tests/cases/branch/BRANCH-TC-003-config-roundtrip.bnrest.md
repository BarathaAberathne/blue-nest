---
id: BRANCH-TC-003
number: 1.2.5
type: Test Case
title: Address, opening hours, and capacity are configurable and round-trip via PUT
owner: QA
mode: Standalone
status: Active
tags:
  - branch
  - golden-path
dependsOn: []
uses:
  - AUTH-UTIL-001
  - BRANCH-UTIL-001
fixtureScope: case
timeoutSeconds: 30
---

# Config fields round-trip via PUT

Replaces legacy `BranchSuite.tc_br_003_configFieldsRoundTrip`. The GET
response carries read-only fields (`id`/`org_id`/`created_at`/
`updated_at`/`managers`) the PUT endpoint's `DisallowUnknownFields`
rejects — `RemoveJson` strips them before sending the branch back, exactly
what legacy's `BRANCH_REQUEST_KEYS` allowlist did.

```bnrest
Given Call ../../utils/auth/AUTH-UTIL-001-login.bnrest.md With Json Into session
{
  "email": "admin@bluenest.uk",
  "password": "${secret:QA_ADMIN_PASSWORD}"
}

And Call ../../utils/branch/BRANCH-UTIL-001-get-branch.bnrest.md With Json Into harrow
{
  "slug": "harrow",
  "accessToken": "${session.accessToken}"
}

RemoveJson harrow id
RemoveJson harrow org_id
RemoveJson harrow created_at
RemoveJson harrow updated_at
RemoveJson harrow managers

When Put /api/v1/admin/branches/harrow Into updated Using session.accessToken
${harrow}

Then AssertStatus updated 200
And Assert updated.body.data.contact.address != null
And Assert updated.body.data.admissions.opening_time != null
And AssertJson updated $.body.data.opening_hours.length() > 0
And Assert updated.body.data.capacity > 0
```
