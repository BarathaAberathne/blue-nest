---
id: FIN-TC-003
number: 2.31.3
type: Test Case
title: A portal parent sees ONLY their own family's finance; no family and no auth are handled safely
owner: QA
mode: Standalone
status: Active
tags:
  - finance
  - security
  - regression
dependsOn: []
uses:
  - CHILD-UTIL-003
fixtureScope: case
timeoutSeconds: 40
---

# Portal finance scope

An activated parent reads their own family view at /portal/finance; a parent
whose family has not been set up gets a null family (not an error); the
endpoint requires authentication.

```bnrest
Setup
Set f3Suffix = random()
Call ../../utils/child/CHILD-UTIL-003-create-child-direct.bnrest.md With Json Into pfChild
{ "accessToken": "${adminSession.accessToken}", "branchSlug": "${branch.slug}", "firstName": "QA-AUTOTEST", "lastName": "PortalFin-${f3Suffix}", "dob": "${today("-24m")}" }

Call ../../utils/child/CHILD-UTIL-003-create-child-direct.bnrest.md With Json Into nfChild
{ "accessToken": "${adminSession.accessToken}", "branchSlug": "${branch.slug}", "firstName": "QA-AUTOTEST", "lastName": "NoFam-${f3Suffix}", "dob": "${today("-24m")}" }

Body
# Family parent: link + family + a charge.
When Post /api/v1/admin/children/${pfChild.id}/parents Into rel Using adminSession.accessToken
{ "parent": { "first_name": "QA-AUTOTEST", "last_name": "PFinPar-${f3Suffix}", "email": "qa-autotest-pfinpar-${f3Suffix}@bluenest.test" }, "relationship": "mother", "billing_contact": true, "portal_access": true }
Then AssertStatus rel 201

When Post /api/v1/admin/children/${pfChild.id}/family Into fam Using adminSession.accessToken
{}
Then AssertStatus fam 200

When Post /api/v1/admin/families/${fam.body.data.id}/charges Into charge Using adminSession.accessToken
{ "child_id": "${pfChild.id}", "description": "QA-AUTOTEST fees", "amount_pence": 45000, "due_date": "${today("+2w")}" }
Then AssertStatus charge 201

# Activate the billing parent on the portal.
When Post /api/v1/admin/parents/${rel.body.data.parent_id}/invite Into invite Using adminSession.accessToken
{ "temporary_days": 7 }
Then AssertStatus invite 200

When Post /api/v1/auth/portal/activate Into activated
{ "parent_id": "${rel.body.data.parent_id}", "token": "${invite.body.data.token}", "password": "Portal-pass-2026" }
Then AssertStatus activated 200

When Post /api/v1/auth/login Into pLogin
{ "email": "qa-autotest-pfinpar-${f3Suffix}@bluenest.test", "password": "Portal-pass-2026" }
Then AssertStatus pLogin 200

# The parent sees their OWN family + charge + balance.
When Get /api/v1/portal/finance Into mine Using pLogin.body.data.access_token
Then AssertStatus mine 200
And AssertJson mine "$.body.data.family.id" == "${fam.body.data.id}"
And AssertJson mine "$.body.data.family.balance_pence" == 45000
And AssertJson mine "$.body.data.charges[?(@.description=='QA-AUTOTEST fees')]" == 1

# A parent with no family account yet gets a graceful null, not an error.
When Post /api/v1/admin/children/${nfChild.id}/parents Into relNF Using adminSession.accessToken
{ "parent": { "first_name": "QA-AUTOTEST", "last_name": "NFPar-${f3Suffix}", "email": "qa-autotest-nfpar-${f3Suffix}@bluenest.test" }, "relationship": "father", "portal_access": true }
Then AssertStatus relNF 201

When Post /api/v1/admin/parents/${relNF.body.data.parent_id}/invite Into inviteNF Using adminSession.accessToken
{ "temporary_days": 7 }
Then AssertStatus inviteNF 200

When Post /api/v1/auth/portal/activate Into activatedNF
{ "parent_id": "${relNF.body.data.parent_id}", "token": "${inviteNF.body.data.token}", "password": "Portal-pass-2026" }
Then AssertStatus activatedNF 200

When Post /api/v1/auth/login Into nfLogin
{ "email": "qa-autotest-nfpar-${f3Suffix}@bluenest.test", "password": "Portal-pass-2026" }
Then AssertStatus nfLogin 200

When Get /api/v1/portal/finance Into noFam Using nfLogin.body.data.access_token
Then AssertStatus noFam 200
And Assert noFam.body.data.family == null

# Unauthenticated access is refused.
When Get /api/v1/portal/finance Into anon
Then AssertStatus anon 401

Teardown
Delete /api/v1/admin/parent-relationships/${rel.body.data.id} Using adminSession.accessToken
Delete /api/v1/admin/parents/${rel.body.data.parent_id} Using adminSession.accessToken
Delete /api/v1/admin/parent-relationships/${relNF.body.data.id} Using adminSession.accessToken
Delete /api/v1/admin/parents/${relNF.body.data.parent_id} Using adminSession.accessToken
Delete /api/v1/admin/children/${pfChild.id} Using adminSession.accessToken
Delete /api/v1/admin/children/${nfChild.id} Using adminSession.accessToken
```
