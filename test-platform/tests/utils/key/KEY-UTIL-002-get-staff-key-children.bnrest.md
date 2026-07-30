---
id: KEY-UTIL-002
number: U.12
type: Test Util
title: Get the children a staff member is key person for
owner: QA Platform
mode: Standalone
status: Active
tags:
  - staff
  - key-person
fixtureScope: case
timeoutSeconds: 30
---

# Get a staff member's key children (reverse lookup)

Thin wrapper over `GET /admin/staff/{id}/key-children`
(`AdminChildHandler.KeyChildren`). Deliberately outputs the **raw response**
(bare `Output result`, no field extraction) so callers can `AssertJson`
directly against `$.body.data[...]` — the count/shape of this list is
exactly what the Key Person tests need to assert on, not a derived summary.

Inputs: `input.accessToken`, `input.staffId`.

```bnrest
Get /api/v1/admin/staff/${input.staffId}/key-children Into result Using input.accessToken
AssertStatus result 200

Output result
```
