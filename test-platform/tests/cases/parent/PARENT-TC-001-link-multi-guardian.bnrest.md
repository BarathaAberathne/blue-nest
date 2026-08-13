---
id: PARENT-TC-001
number: 2.29.1
type: Test Case
title: A child supports multiple guardians with distinct flags; duplicates and linked-parent deletes are rejected
owner: QA
mode: Standalone
status: Active
tags:
  - parent
  - regression
dependsOn: []
uses: []
fixtureScope: case
timeoutSeconds: 40
---

# Multi-guardian linking

Creates two parents inline (mother with parental responsibility + a
grandparent emergency contact), verifies the child's contact list, rejects a
duplicate link and a linked-parent delete, updates flags, and unlinks.

```bnrest
Setup
Set p1Suffix = random()

Body
When Post /api/v1/admin/children/${child.id}/parents Into mum Using adminSession.accessToken
{ "parent": { "first_name": "QA-AUTOTEST", "last_name": "Mum-${p1Suffix}", "email": "qa-autotest-mum-${p1Suffix}@bluenest.test", "mobile_phone": "07000000001" }, "relationship": "mother", "parental_responsibility": true, "primary_contact": true, "lives_with_child": true, "portal_access": true, "receives_communications": true }
Then AssertStatus mum 201
And Assert mum.body.data.parental_responsibility == true
And Assert mum.body.data.parent_name != null

When Post /api/v1/admin/children/${child.id}/parents Into gran Using adminSession.accessToken
{ "parent": { "first_name": "QA-AUTOTEST", "last_name": "Gran-${p1Suffix}", "email": "qa-autotest-gran-${p1Suffix}@bluenest.test" }, "relationship": "grandparent", "emergency_contact": true, "authorised_collection": true, "priority": 1 }
Then AssertStatus gran 201

# The child's contact list shows both, with their flags.
When Get /api/v1/admin/children/${child.id}/parents Into rels Using adminSession.accessToken
Then AssertStatus rels 200
And AssertJson rels "$.body.data[?(@.relationship=='mother')]" == 1
And AssertJson rels "$.body.data[?(@.emergency_contact==true)]" == 1

# Linking the same parent again is rejected.
When Post /api/v1/admin/children/${child.id}/parents Into dup Using adminSession.accessToken
{ "parent_id": "${mum.body.data.parent_id}", "relationship": "mother" }
Then AssertStatus dup 400

# Deleting a linked parent is guarded.
When Delete /api/v1/admin/parents/${mum.body.data.parent_id} Into delGuard Using adminSession.accessToken
Then AssertStatus delGuard 400

# Flags update on the relationship.
When Put /api/v1/admin/parent-relationships/${gran.body.data.id} Into upd Using adminSession.accessToken
{ "relationship": "grandparent", "emergency_contact": true, "authorised_collection": false, "priority": 2 }
Then AssertStatus upd 200
And Assert upd.body.data.authorised_collection == false

# Unlink works; the parent record itself remains.
When Delete /api/v1/admin/parent-relationships/${gran.body.data.id} Into gone Using adminSession.accessToken
Then AssertStatus gone 204

When Get /api/v1/admin/parents/${gran.body.data.parent_id} Into granStill Using adminSession.accessToken
Then AssertStatus granStill 200

Teardown
Delete /api/v1/admin/parents/${gran.body.data.parent_id} Using adminSession.accessToken
Delete /api/v1/admin/parent-relationships/${mum.body.data.id} Using adminSession.accessToken
Delete /api/v1/admin/parents/${mum.body.data.parent_id} Using adminSession.accessToken
```
