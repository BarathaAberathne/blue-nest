---
id: ME-TC-001
number: 2.24.1
type: Test Case
title: A staff member views and self-edits their profile, and reads their attendance and rota
owner: QA
mode: Standalone
status: Active
tags:
  - me
  - regression
dependsOn: []
uses: []
fixtureScope: case
timeoutSeconds: 30
---

# Self-service My Profile hub

New coverage (`SUI-ME-001`). Reads the shared `meSession` (a staff login whose
account is linked to `meStaff`). The signed-in user resolves to their own staff
record, self-edits the allowed subset (contact + qualifications), and reads
their attendance history and personal rota.

```bnrest
Given Get /api/v1/me/profile Into prof Using meSession.accessToken
Then AssertStatus prof 200
And Assert prof.body.data.id == meStaff.id

When Put /api/v1/me/profile Into upd Using meSession.accessToken
{ "phone": "07700 900123", "email": "${meStaff.email}", "qualifications": ["Paediatric First Aid"], "dbs_number": "QA-DBS-1" }
Then AssertStatus upd 200
And Assert upd.body.data.phone == "07700 900123"
And AssertJson upd "$.body.data.qualifications[?(@=='Paediatric First Aid')].length()" == 1

When Get /api/v1/me/attendance Into att Using meSession.accessToken
Then AssertStatus att 200

When Get /api/v1/me/rota Into rota Using meSession.accessToken
Then AssertStatus rota 200

When Get /api/v1/leave-requests/balance Into bal Using meSession.accessToken
Then AssertStatus bal 200
And Assert bal.body.data.leave.capped == true
And Assert bal.body.data.unpaid_leave.capped == false
```
