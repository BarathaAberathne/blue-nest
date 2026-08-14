---
id: PAYROLL-TC-003
number: 2.35.3
type: Test Case
title: A staff member with no records in the period still appears with a zero row (payroll must see everyone)
owner: QA
mode: Standalone
status: Active
tags:
  - payroll
dependsOn: []
uses: []
fixtureScope: case
timeoutSeconds: 30
---

# Zero-record staff still appear

Payroll must list every currently-employed staff member of the scope even
when the register holds nothing for them in the period — a silent omission
would read as "left" rather than "never clocked". Queries a far-future
week (`+45w`, beyond every date this suite writes) so the fixture staff
member deterministically has no records. Reads the shared
`adminSession`/`branch`/`staff` suite fixtures — see `SUI-PAYROLL-001`.

```bnrest
When Get /api/v1/admin/payroll?from=${today("+45w")}&to=${today("+45w+6d")}&branch=${branch.slug} Into empty Using adminSession.accessToken
Then AssertStatus empty 200
And AssertJson empty "$.body.data.rows.length()" == 1
And AssertJson empty "$.body.data.rows[0].staff_id" == "${staff.body.data.id}"
And AssertJson empty "$.body.data.rows[0].worked_days" == 0
And AssertJson empty "$.body.data.rows[0].worked_minutes" == 0
```
