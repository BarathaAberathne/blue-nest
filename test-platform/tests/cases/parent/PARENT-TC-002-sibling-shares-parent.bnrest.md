---
id: PARENT-TC-002
number: 2.29.2
type: Test Case
title: Linking a sibling with the same parent email reuses ONE parent record
owner: QA
mode: Standalone
status: Active
tags:
  - parent
  - regression
dependsOn: []
uses:
  - CHILD-UTIL-003
fixtureScope: case
timeoutSeconds: 40
---

# Siblings share one parent record

Two children linked with an inline parent carrying the SAME email resolve to
the same Parent (create-or-link by email), and the parent's children list
shows both.

```bnrest
Setup
Set p2Suffix = random()
Call ../../utils/child/CHILD-UTIL-003-create-child-direct.bnrest.md With Json Into sibling
{ "accessToken": "${adminSession.accessToken}", "branchSlug": "${branch.slug}", "firstName": "QA-AUTOTEST", "lastName": "Sibling-${p2Suffix}", "dob": "${today("-18m")}" }

Body
When Post /api/v1/admin/children/${child.id}/parents Into linkA Using adminSession.accessToken
{ "parent": { "first_name": "QA-AUTOTEST", "last_name": "SharedDad-${p2Suffix}", "email": "qa-autotest-dad-${p2Suffix}@bluenest.test" }, "relationship": "father", "parental_responsibility": true }
Then AssertStatus linkA 201

When Post /api/v1/admin/children/${sibling.id}/parents Into linkB Using adminSession.accessToken
{ "parent": { "first_name": "QA-AUTOTEST", "last_name": "SharedDad-${p2Suffix}", "email": "qa-autotest-dad-${p2Suffix}@bluenest.test" }, "relationship": "father", "parental_responsibility": true }
Then AssertStatus linkB 201
And Assert linkB.body.data.parent_id == linkA.body.data.parent_id

When Get /api/v1/admin/parents/${linkA.body.data.parent_id}/children Into kids Using adminSession.accessToken
Then AssertStatus kids 200
And AssertJson kids "$.body.data[?(@.relationship=='father')]" == 2

Teardown
Delete /api/v1/admin/parent-relationships/${linkA.body.data.id} Using adminSession.accessToken
Delete /api/v1/admin/parent-relationships/${linkB.body.data.id} Using adminSession.accessToken
Delete /api/v1/admin/parents/${linkA.body.data.parent_id} Using adminSession.accessToken
Delete /api/v1/admin/children/${sibling.id} Using adminSession.accessToken
```
