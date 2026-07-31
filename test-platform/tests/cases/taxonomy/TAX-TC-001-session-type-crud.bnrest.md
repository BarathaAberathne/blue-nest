---
id: TAX-TC-001
number: 2.21.1
type: Test Case
title: A session-type taxonomy term can be created, listed, updated and deleted
owner: QA
mode: Standalone
status: Active
tags:
  - taxonomy
  - regression
dependsOn: []
uses: []
fixtureScope: case
timeoutSeconds: 30
---

# Configurable list (session_type) CRUD

New coverage for the configurable taxonomy: an authorised user can add a
session slot, it appears in the list, can be edited, and deleted. Code is
derived from the label when omitted. Reads the shared `adminSession`
fixture (see `SUI-TAXONOMY-001`).

```bnrest
When Post /api/v1/admin/taxonomy Into created Using adminSession.accessToken
{ "category": "session_type", "label": "QA-AUTOTEST Twilight", "start_time": "16:00", "end_time": "18:00" }
Then AssertStatus created 201
And Assert created.body.data.code != null
And Assert created.body.data.active == true

When Get /api/v1/admin/taxonomy?category=session_type Into list Using adminSession.accessToken
Then AssertStatus list 200
And AssertJson list "$.body.data[?(@.label=='QA-AUTOTEST Twilight')]" == 1

When Put /api/v1/admin/taxonomy/${created.body.data.id} Into updated Using adminSession.accessToken
{ "category": "session_type", "label": "QA-AUTOTEST Twilight Late", "start_time": "16:00", "end_time": "18:30" }
Then AssertStatus updated 200
And Assert updated.body.data.label == "QA-AUTOTEST Twilight Late"

When Delete /api/v1/admin/taxonomy/${created.body.data.id} Into deleted Using adminSession.accessToken
Then AssertStatus deleted 204
```
