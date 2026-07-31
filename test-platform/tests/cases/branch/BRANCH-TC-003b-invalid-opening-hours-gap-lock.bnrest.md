---
id: BRANCH-TC-003b
number: 1.2.6
type: Test Case
title: An invalid opening-hours entry is accepted, not rejected (gap lock)
owner: QA
mode: Standalone
status: Active
tags:
  - branch
  - regression
dependsOn: []
uses:
  - AUTH-UTIL-001
  - BRANCH-UTIL-001
fixtureScope: case
timeoutSeconds: 30
---

# Invalid opening-hours entry is accepted (documented gap, not a test bug)

Replaces legacy `BranchSuite.tc_br_003b_invalidOpeningHoursNotValidated` — a
**gap lock**: the plan expects invalid hours to be rejected; the real
system accepts them unconditionally. This asserts the real (flawed)
behaviour on purpose, same as the legacy test.

Harrow is shared, live fixture data every other suite depends on —
`Teardown` restores the original opening hours **even if the Body's own
assertion fails** (finally-semantics, see `test-platform-architecture.md`).

```bnrest
Setup
Call ../../utils/auth/AUTH-UTIL-001-login.bnrest.md With Json Into session
{
  "email": "admin@bluenest.uk",
  "password": "${secret:QA_ADMIN_PASSWORD}"
}

Call ../../utils/branch/BRANCH-UTIL-001-get-branch.bnrest.md With Json Into harrow
{
  "slug": "harrow",
  "accessToken": "${session.accessToken}"
}

RemoveJson harrow id
RemoveJson harrow org_id
RemoveJson harrow created_at
RemoveJson harrow updated_at
RemoveJson harrow managers
RemoveJson harrow ref

CopyJson harrow $.opening_hours[0].open Into originalOpen
CopyJson harrow $.opening_hours[0].close Into originalClose

Body
ApplyJson harrow opening_hours[0].open = "QA-AUTOTEST-not-a-time"
ApplyJson harrow opening_hours[0].close = "also-not-a-time"

Put /api/v1/admin/branches/harrow Into corrupted Using session.accessToken
${harrow}

AssertStatus corrupted 200
Assert corrupted.body.data.opening_hours[0].open == "QA-AUTOTEST-not-a-time"

Teardown
ApplyJson harrow opening_hours[0].open = originalOpen
ApplyJson harrow opening_hours[0].close = originalClose

Put /api/v1/admin/branches/harrow Into restored Using session.accessToken
${harrow}

AssertStatus restored 200
Assert restored.body.data.opening_hours[0].open != "QA-AUTOTEST-not-a-time"
```
