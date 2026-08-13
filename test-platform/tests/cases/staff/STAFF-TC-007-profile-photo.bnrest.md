---
id: STAFF-TC-007
number: 1.4.17
type: Test Case
title: Staff profile photo set/clear round-trip; hotlinks rejected; photo survives a profile update
owner: QA
mode: Standalone
status: Active
tags:
  - staff
  - regression
dependsOn: []
uses:
  - AUTH-UTIL-001
  - BRANCH-FIX-001
  - BRANCH-FIX-002
fixtureScope: case
timeoutSeconds: 30
---

# Staff profile photo

`PATCH /admin/staff/{id}/photo` sets and clears the photo; only our own
uploads are accepted (an external hotlink is rejected); a normal profile
`PUT` never wipes the stored photo (SetPhoto is the only writer).

```bnrest
Setup
Call ../../utils/auth/AUTH-UTIL-001-login.bnrest.md With Json Into session
{ "email": "admin@bluenest.uk", "password": "${secret:QA_ADMIN_PASSWORD}" }

Call ../../utils/branch/BRANCH-FIX-001-create-test-branch.bnrest.md With Json Into branch
{ "accessToken": "${session.accessToken}" }

Set photoSuffix = random()

Post /api/v1/admin/staff Into fixture Using session.accessToken
{ "first_name": "QA-AUTOTEST", "last_name": "Photo-${photoSuffix}", "email": "qa-autotest-staffphoto-${photoSuffix}@bluenest.test", "job_title": "Practitioner", "branch_slug": "${branch.slug}" }
AssertStatus fixture 201

Body
# Set a photo (our /uploads path shape).
When Patch /api/v1/admin/staff/${fixture.body.data.id}/photo Into set Using session.accessToken
{ "photo_url": "/uploads/qa-autotest-${photoSuffix}.jpg" }
Then AssertStatus set 200
And AssertJson set "$.body.data.photo_url" == "/uploads/qa-autotest-${photoSuffix}.jpg"

# The photo comes back on a normal read.
When Get /api/v1/admin/staff/${fixture.body.data.id} Into read Using session.accessToken
Then AssertStatus read 200
And AssertJson read "$.body.data.photo_url" == "/uploads/qa-autotest-${photoSuffix}.jpg"

# An external hotlink is rejected.
When Patch /api/v1/admin/staff/${fixture.body.data.id}/photo Into hotlink Using session.accessToken
{ "photo_url": "https://evil.example.com/pic.jpg" }
Then AssertStatus hotlink 400

# A profile update does NOT wipe the photo.
When Put /api/v1/admin/staff/${fixture.body.data.id} Into updated Using session.accessToken
{ "first_name": "QA-AUTOTEST", "last_name": "Photo-${photoSuffix}", "branch_slug": "${branch.slug}", "job_title": "Senior Practitioner" }
Then AssertStatus updated 200
And AssertJson updated "$.body.data.photo_url" == "/uploads/qa-autotest-${photoSuffix}.jpg"

# Clearing removes it.
When Patch /api/v1/admin/staff/${fixture.body.data.id}/photo Into cleared Using session.accessToken
{ "photo_url": "" }
Then AssertStatus cleared 200
And AssertJson cleared "$.body[?(@.data && !@.data.photo_url)]" == 1

Teardown
Delete /api/v1/admin/staff/${fixture.body.data.id} Using session.accessToken
Call ../../utils/branch/BRANCH-FIX-002-archive-test-branch.bnrest.md With Json Into cleanup
{ "accessToken": "${session.accessToken}", "slug": "${branch.slug}" }
```
