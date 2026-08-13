---
id: REG-TC-007
number: 1.5.8
type: Test Case
title: Child profile photo set/clear round-trip; hotlinks rejected; photo survives a profile update
owner: QA
mode: Standalone
status: Active
tags:
  - reg
  - regression
dependsOn: []
uses:
  - AUTH-UTIL-001
  - BRANCH-FIX-001
  - BRANCH-FIX-002
  - CHILD-UTIL-003
fixtureScope: case
timeoutSeconds: 30
---

# Child profile photo

`PATCH /admin/children/{id}/photo` sets and clears the photo; only our own
uploads are accepted; a normal child `PUT` never wipes the stored photo.

```bnrest
Setup
Call ../../utils/auth/AUTH-UTIL-001-login.bnrest.md With Json Into session
{ "email": "admin@bluenest.uk", "password": "${secret:QA_ADMIN_PASSWORD}" }

Call ../../utils/branch/BRANCH-FIX-001-create-test-branch.bnrest.md With Json Into branch
{ "accessToken": "${session.accessToken}" }

Set cpSuffix = random()
Call ../../utils/child/CHILD-UTIL-003-create-child-direct.bnrest.md With Json Into child
{ "accessToken": "${session.accessToken}", "branchSlug": "${branch.slug}", "firstName": "QA-AUTOTEST", "lastName": "Photo-${cpSuffix}", "dob": "${today("-24m")}" }

Body
When Patch /api/v1/admin/children/${child.id}/photo Into set Using session.accessToken
{ "photo_url": "/uploads/qa-autotest-child-${cpSuffix}.jpg" }
Then AssertStatus set 200
And AssertJson set "$.body.data.photo_url" == "/uploads/qa-autotest-child-${cpSuffix}.jpg"

When Get /api/v1/admin/children/${child.id} Into read Using session.accessToken
Then AssertStatus read 200
And AssertJson read "$.body.data.photo_url" == "/uploads/qa-autotest-child-${cpSuffix}.jpg"

# External hotlink rejected.
When Patch /api/v1/admin/children/${child.id}/photo Into hotlink Using session.accessToken
{ "photo_url": "https://evil.example.com/pic.jpg" }
Then AssertStatus hotlink 400

# A profile update does NOT wipe the photo.
When Put /api/v1/admin/children/${child.id} Into updated Using session.accessToken
{ "first_name": "QA-AUTOTEST", "last_name": "Photo-${cpSuffix}", "branch_slug": "${branch.slug}", "gender": "female" }
Then AssertStatus updated 200

When Get /api/v1/admin/children/${child.id} Into read2 Using session.accessToken
Then AssertStatus read2 200
And AssertJson read2 "$.body.data.photo_url" == "/uploads/qa-autotest-child-${cpSuffix}.jpg"

# Clearing removes it.
When Patch /api/v1/admin/children/${child.id}/photo Into cleared Using session.accessToken
{ "photo_url": "" }
Then AssertStatus cleared 200
And AssertJson cleared "$.body[?(@.data && !@.data.photo_url)]" == 1

Teardown
Delete /api/v1/admin/children/${child.id} Using session.accessToken
Call ../../utils/branch/BRANCH-FIX-002-archive-test-branch.bnrest.md With Json Into cleanup
{ "accessToken": "${session.accessToken}", "slug": "${branch.slug}" }
```
