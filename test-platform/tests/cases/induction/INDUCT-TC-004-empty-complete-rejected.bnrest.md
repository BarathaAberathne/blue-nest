---
id: INDUCT-TC-004
number: 2.30.4
type: Test Case
title: A section cannot be marked complete without any answered value (regression)
owner: QA
mode: Standalone
status: Active
tags:
  - induction
  - regression
dependsOn: []
uses: []
fixtureScope: case
timeoutSeconds: 30
---

# Empty sections can never be "complete"

Found live: the portal wizard's Next button marked every section complete
regardless of content, so a parent could "finish" the induction without
entering anything. The wizard now computes completeness from the required
fields (`lib/induction.ts` `sectionMissing`), and THIS locks the server
backstop: `complete: true` with no answered value (empty data, blank
strings, false bools, empty lists) is rejected 400; a progress save
(`complete: false`) still works; and the explicit nothing-to-record
declaration (`confirmed_nothing_to_record`, used by all-optional sections
like allergies/development) counts as an answer. MUST run before
INDUCT-TC-001 in the suite — a reviewed induction rejects every save.

```bnrest
Body
When Put /api/v1/admin/children/${child.id}/induction/sections/development Into emptyComplete Using adminSession.accessToken
{ "data": {}, "complete": true }
Then AssertStatus emptyComplete 400

When Put /api/v1/admin/children/${child.id}/induction/sections/development Into blanksComplete Using adminSession.accessToken
{ "data": { "difficulties": "   ", "sen": "" }, "complete": true }
Then AssertStatus blanksComplete 400

When Put /api/v1/admin/children/${child.id}/induction/sections/development Into progressSave Using adminSession.accessToken
{ "data": {}, "complete": false }
Then AssertStatus progressSave 200

When Put /api/v1/admin/children/${child.id}/induction/sections/development Into declaredNone Using adminSession.accessToken
{ "data": { "confirmed_nothing_to_record": true }, "complete": true }
Then AssertStatus declaredNone 200
And AssertJson declaredNone "$.body.data.sections.development.complete" == true
```
