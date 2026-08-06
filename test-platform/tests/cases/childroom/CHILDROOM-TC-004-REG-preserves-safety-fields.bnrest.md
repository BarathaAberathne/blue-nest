---
id: CHILDROOM-TC-004-REG
number: 1.9.8
type: Test Case
title: A room-only update does NOT wipe allergies or medical notes
owner: QA
mode: Standalone
status: Active
tags:
  - childroom
  - regression
  - safeguarding
dependsOn: []
uses: []
fixtureScope: case
timeoutSeconds: 30
---

# Partial update preserves safety fields (Critical/safeguarding regression)

A safeguarding regression lock: a minimal `PUT /admin/children/{id}` must
never silently wipe `allergies`/`medical_notes`/`dietary_reqs` (a real
data-loss bug found earlier via this style of test). Reads the shared
`adminSession`/`branch` suite fixtures — see `SUI-CHILDROOM-001`.

```bnrest
Setup
Post /api/v1/admin/children Into fixture Using adminSession.accessToken
{
  "first_name": "QA-AUTOTEST",
  "last_name": "SafetyWipeCheck-${random()}",
  "dob": "${today("-5m")}",
  "branch_slug": "${branch.slug}",
  "allergies": "Peanuts - severe",
  "medical_notes": "EpiPen in bag",
  "dietary_reqs": "No dairy"
}
AssertStatus fixture 201

Body
When Put /api/v1/admin/children/${fixture.body.data.id} Into updated Using adminSession.accessToken
{
  "branch_slug": "${branch.slug}",
  "gender": "female"
}
Then AssertStatus updated 200
And Assert updated.body.data.allergies == "Peanuts - severe"
And Assert updated.body.data.medical_notes == "EpiPen in bag"
And Assert updated.body.data.dietary_reqs == "No dairy"

Teardown
Delete /api/v1/admin/children/${fixture.body.data.id} Using adminSession.accessToken
```
