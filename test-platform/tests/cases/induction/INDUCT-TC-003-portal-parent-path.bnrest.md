---
id: INDUCT-TC-003
number: 2.30.3
type: Test Case
title: An activated parent saves induction sections and signs consents for THEIR child only
owner: QA
mode: Standalone
status: Active
tags:
  - induction
  - security
  - regression
dependsOn: []
uses:
  - CHILD-UTIL-003
fixtureScope: case
timeoutSeconds: 40
---

# Portal parent path

Invites + activates a parent, then: they read the induction, save a section
(recorded against their user), sign a consent (recorded against their parent
id), and every induction/consent route 404s for a child they are not linked
to.

```bnrest
Setup
Set c3Suffix = random()
Call ../../utils/child/CHILD-UTIL-003-create-child-direct.bnrest.md With Json Into pChild
{ "accessToken": "${adminSession.accessToken}", "branchSlug": "${branch.slug}", "firstName": "QA-AUTOTEST", "lastName": "PortalKid-${c3Suffix}", "dob": "${today("-24m")}" }

Body
When Post /api/v1/admin/children/${pChild.id}/parents Into rel Using adminSession.accessToken
{ "parent": { "first_name": "QA-AUTOTEST", "last_name": "PPar-${c3Suffix}", "email": "qa-autotest-ppar-${c3Suffix}@bluenest.test" }, "relationship": "mother", "portal_access": true }
Then AssertStatus rel 201

When Post /api/v1/admin/parents/${rel.body.data.parent_id}/invite Into invite Using adminSession.accessToken
{ "temporary_days": 7 }
Then AssertStatus invite 200

When Post /api/v1/auth/portal/activate Into activated
{ "parent_id": "${rel.body.data.parent_id}", "token": "${invite.body.data.token}", "password": "Portal-pass-2026" }
Then AssertStatus activated 200

When Post /api/v1/auth/login Into pLogin
{ "email": "qa-autotest-ppar-${c3Suffix}@bluenest.test", "password": "Portal-pass-2026" }
Then AssertStatus pLogin 200

# Parent reads + saves a section (save & resume from the portal).
When Get /api/v1/portal/children/${pChild.id}/induction Into pInd Using pLogin.body.data.access_token
Then AssertStatus pInd 200

When Put /api/v1/portal/children/${pChild.id}/induction/sections/routine Into pSave Using pLogin.body.data.access_token
{ "data": { "sleep_pattern": "No daytime naps", "special_toy": "Blue rabbit" }, "complete": true }
Then AssertStatus pSave 200
And Assert pSave.body.data.status == "in_progress"

# Parent signs a consent — recorded against their parent record.
When Post /api/v1/portal/children/${pChild.id}/consents Into pConsent Using pLogin.body.data.access_token
{ "key": "outings", "granted": true, "signature_name": "QA-AUTOTEST PPar-${c3Suffix}" }
Then AssertStatus pConsent 201
And AssertJson pConsent "$.body.data.signed_by_parent_id" == "${rel.body.data.parent_id}"

# The onboarding view is visible to the parent for their child.
When Get /api/v1/portal/children/${pChild.id}/onboarding Into pOnb Using pLogin.body.data.access_token
Then AssertStatus pOnb 200
And Assert pOnb.body.data.percent != null

# A child they are NOT linked to 404s on every route.
When Get /api/v1/portal/children/${child.id}/induction Into foreignInd Using pLogin.body.data.access_token
Then AssertStatus foreignInd 404

When Post /api/v1/portal/children/${child.id}/consents Into foreignCon Using pLogin.body.data.access_token
{ "key": "outings", "granted": true, "signature_name": "X" }
Then AssertStatus foreignCon 404

Teardown
Delete /api/v1/admin/parent-relationships/${rel.body.data.id} Using adminSession.accessToken
Delete /api/v1/admin/parents/${rel.body.data.parent_id} Using adminSession.accessToken
Delete /api/v1/admin/children/${pChild.id} Using adminSession.accessToken
```
