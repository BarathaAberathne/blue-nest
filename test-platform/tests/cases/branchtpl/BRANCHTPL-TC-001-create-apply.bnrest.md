---
id: BRANCHTPL-TC-001
number: 2.26.1
type: Test Case
title: A branch template can be created and applied to provision a branch's rooms
owner: QA
mode: Standalone
status: Active
tags:
  - branch-templates
  - regression
dependsOn: []
uses: []
fixtureScope: case
timeoutSeconds: 30
---

# Create + apply a branch template

Creating a template then applying it to a branch creates that branch's rooms.
Reads the shared `adminSession` + `branch` fixtures (see `SUI-BRANCHTPL-001`).

```bnrest
When Post /api/v1/admin/branch-templates Into created Using adminSession.accessToken
{ "name": "QA-AUTOTEST Template ${random()}", "description": "two rooms",
  "rooms": [
    { "name": "QA Babies", "age_range": "0-2", "capacity": 12, "staff_ratio": 3 },
    { "name": "QA Toddlers", "age_range": "2-3", "capacity": 16, "staff_ratio": 4 }
  ] }
Then AssertStatus created 201
And Assert created.body.data.id != null

When Post /api/v1/admin/branch-templates/${created.body.data.id}/apply Into applied Using adminSession.accessToken
{ "branch_slug": "${branch.slug}" }
Then AssertStatus applied 200
And Assert applied.body.data.rooms_created == 2

When Get /api/v1/admin/rooms?branch=${branch.slug} Into rooms Using adminSession.accessToken
Then AssertStatus rooms 200
And AssertJson rooms "$.body.data[?(@.name=='QA Babies')]" == 1
And AssertJson rooms "$.body.data[?(@.name=='QA Toddlers')]" == 1

When Delete /api/v1/admin/branch-templates/${created.body.data.id} Into deleted Using adminSession.accessToken
Then AssertStatus deleted 204
```
