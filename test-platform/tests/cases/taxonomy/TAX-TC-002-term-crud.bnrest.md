---
id: TAX-TC-002
number: 2.21.2
type: Test Case
title: A term-time date range can be created, listed and deleted; invalid dates are rejected
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

# Term dates CRUD + validation

New coverage for the term-time calendar. Reads the shared `adminSession`
fixture (see `SUI-TAXONOMY-001`).

```bnrest
When Post /api/v1/admin/terms Into created Using adminSession.accessToken
{ "branch_slug": "", "name": "QA-AUTOTEST Autumn", "start_date": "2027-09-06", "end_date": "2027-12-17" }
Then AssertStatus created 201
And Assert created.body.data.name == "QA-AUTOTEST Autumn"

When Post /api/v1/admin/terms Into badDates Using adminSession.accessToken
{ "name": "QA-AUTOTEST Bad", "start_date": "2027-12-17", "end_date": "2027-09-06" }
Then AssertStatus badDates 400

When Get /api/v1/admin/terms Into list Using adminSession.accessToken
Then AssertStatus list 200
And AssertJson list "$.body.data[?(@.name=='QA-AUTOTEST Autumn')]" == 1

When Delete /api/v1/admin/terms/${created.body.data.id} Into deleted Using adminSession.accessToken
Then AssertStatus deleted 204
```
