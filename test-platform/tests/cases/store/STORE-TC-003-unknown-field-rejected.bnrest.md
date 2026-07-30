---
id: STORE-TC-003
number: 2.5.3
type: Test Case
title: An unrecognised field in a product body is rejected with 400
owner: QA
mode: Standalone
status: Active
tags:
  - store
dependsOn: []
uses: []
fixtureScope: case
timeoutSeconds: 30
---

# Unknown field is rejected

New coverage (`SUI-STORE-001`). `validator.DecodeJSON`'s
`DisallowUnknownFields()` applies here too. Reads the shared
`adminSession` suite fixture — see `SUI-STORE-001`.

```bnrest
Given Post /api/v1/admin/products Into rejected Using adminSession.accessToken
{
  "sku": "QA-AUTOTEST-${random()}",
  "name": "QA-AUTOTEST",
  "not_a_real_field": "surprise"
}
Then AssertStatus rejected 400
```
