---
id: INDUCT-TC-002
number: 2.30.2
type: Test Case
title: Consents are append-only (latest wins) and the onboarding view derives completeness + status
owner: QA
mode: Standalone
status: Active
tags:
  - induction
  - regression
dependsOn: []
uses:
  - CHILD-UTIL-003
fixtureScope: case
timeoutSeconds: 40
---

# Consents & derived completeness

Uses its own child so INDUCT-TC-001's reviewed induction doesn't skew the
derivation assertions.

```bnrest
Setup
Set c2Suffix = random()
Call ../../utils/child/CHILD-UTIL-003-create-child-direct.bnrest.md With Json Into freshChild
{ "accessToken": "${adminSession.accessToken}", "branchSlug": "${branch.slug}", "firstName": "QA-AUTOTEST", "lastName": "Consent-${c2Suffix}", "dob": "${today("-30m")}" }

Body
# A fresh child: induction_required, low percent, finance outstanding.
When Get /api/v1/admin/children/${freshChild.id}/onboarding Into onb0 Using adminSession.accessToken
Then AssertStatus onb0 200
And Assert onb0.body.data.status == "induction_required"
And AssertJson onb0 "$.body.data.categories[?(@.key=='finance' && @.percent==0)]" == 1

# Unknown consent key and missing signature are rejected.
When Post /api/v1/admin/children/${freshChild.id}/consents Into badKey Using adminSession.accessToken
{ "key": "not-a-consent", "granted": true, "signature_name": "Test Parent" }
Then AssertStatus badKey 400

When Post /api/v1/admin/children/${freshChild.id}/consents Into noSig Using adminSession.accessToken
{ "key": "photos_marketing", "granted": true, "signature_name": "" }
Then AssertStatus noSig 400

# Append-only: decline then grant — the LATEST row wins, both rows kept.
When Post /api/v1/admin/children/${freshChild.id}/consents Into declined Using adminSession.accessToken
{ "key": "photos_marketing", "granted": false, "signature_name": "Test Parent" }
Then AssertStatus declined 201

When Post /api/v1/admin/children/${freshChild.id}/consents Into granted Using adminSession.accessToken
{ "key": "photos_marketing", "granted": true, "signature_name": "Test Parent" }
Then AssertStatus granted 201

When Get /api/v1/admin/children/${freshChild.id}/consents Into rows Using adminSession.accessToken
Then AssertStatus rows 200
And AssertJson rows "$.body.data.consents[?(@.key=='photos_marketing')]" == 2
And AssertJson rows "$.body.data.latest.photos_marketing.granted" == true

# The consents category moved off zero and lists the still-unsigned ones.
When Get /api/v1/admin/children/${freshChild.id}/onboarding Into onb1 Using adminSession.accessToken
Then AssertStatus onb1 200
And AssertJson onb1 "$.body.data.categories[?(@.key=='consents' && @.percent>0)]" == 1

# The manager board includes this child with a percent + status.
When Get /api/v1/admin/onboarding?branch=${branch.slug} Into board Using adminSession.accessToken
Then AssertStatus board 200
And AssertJson board "$.body.data[?(@.child_id=='${freshChild.id}')]" == 1

Teardown
Delete /api/v1/admin/children/${freshChild.id} Using adminSession.accessToken
```
