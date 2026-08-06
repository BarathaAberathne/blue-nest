---
id: TAX-TC-004
number: 2.21.4
type: Test Case
title: An age_group taxonomy term round-trips its min/max age months
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

# Configurable list (age_group) CRUD

Locks the configurable age-band list (T1): an authorised user can add an
age_group term carrying `min_age_months`/`max_age_months`, it reads back with
those bounds, can be edited, and deleted. Reads the shared `adminSession`
fixture (see `SUI-TAXONOMY-001`).

```bnrest
When Post /api/v1/admin/taxonomy Into created Using adminSession.accessToken
{ "category": "age_group", "label": "QA-AUTOTEST Preschool", "min_age_months": 36, "max_age_months": 60 }
Then AssertStatus created 201
And Assert created.body.data.code != null
And Assert created.body.data.min_age_months == 36
And Assert created.body.data.max_age_months == 60

When Get /api/v1/admin/taxonomy?category=age_group Into list Using adminSession.accessToken
Then AssertStatus list 200
And AssertJson list "$.body.data[?(@.label=='QA-AUTOTEST Preschool')]" == 1

When Put /api/v1/admin/taxonomy/${created.body.data.id} Into updated Using adminSession.accessToken
{ "category": "age_group", "label": "QA-AUTOTEST Preschool", "min_age_months": 36, "max_age_months": 0 }
Then AssertStatus updated 200
And Assert updated.body.data.max_age_months == 0

When Delete /api/v1/admin/taxonomy/${created.body.data.id} Into deleted Using adminSession.accessToken
Then AssertStatus deleted 204
```
