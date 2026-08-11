---
id: FIN-TC-004
number: 2.31.4
type: Test Case
title: Manual + scheduled fee reminders write the communication log; the sweep dedupes per rule
owner: QA
mode: Standalone
status: Active
tags:
  - finance
  - regression
dependsOn: []
uses:
  - CHILD-UTIL-003
fixtureScope: case
timeoutSeconds: 40
---

# Reminders & communications

A due-today charge produces a `reminder_due` on the sweep; re-running the
sweep never re-sends it; a manual reminder always sends and everything lands
in the family's communication log.

```bnrest
Setup
Set f4Suffix = random()
Call ../../utils/child/CHILD-UTIL-003-create-child-direct.bnrest.md With Json Into remChild
{ "accessToken": "${adminSession.accessToken}", "branchSlug": "${branch.slug}", "firstName": "QA-AUTOTEST", "lastName": "Remind-${f4Suffix}", "dob": "${today("-24m")}" }

Body
When Post /api/v1/admin/children/${remChild.id}/parents Into rel Using adminSession.accessToken
{ "parent": { "first_name": "QA-AUTOTEST", "last_name": "RemPar-${f4Suffix}", "email": "qa-autotest-rempar-${f4Suffix}@bluenest.test" }, "relationship": "mother", "billing_contact": true }
Then AssertStatus rel 201

When Post /api/v1/admin/children/${remChild.id}/family Into fam Using adminSession.accessToken
{}
Then AssertStatus fam 200

# A charge due today (starts "due"), plus one paid-off later to prove settled
# charges cannot be reminded.
When Post /api/v1/admin/families/${fam.body.data.id}/charges Into dueCharge Using adminSession.accessToken
{ "child_id": "${remChild.id}", "description": "QA-AUTOTEST due-today", "amount_pence": 20000, "due_date": "${today()}" }
Then AssertStatus dueCharge 201
And Assert dueCharge.body.data.status == "due"

# Sweep → the due-0 reminder + this family's DD-incomplete nudge are written.
When Post /api/v1/admin/finance/reminders/run Into sweep1 Using adminSession.accessToken
{}
Then AssertStatus sweep1 200

When Get /api/v1/admin/families/${fam.body.data.id}/communications Into comms1 Using adminSession.accessToken
Then AssertStatus comms1 200
And AssertJson comms1 "$.body.data[?(@.kind=='reminder_due')]" == 1
And AssertJson comms1 "$.body.data[?(@.kind=='dd_incomplete')]" == 1

# Re-running the sweep never duplicates this family's reminders.
When Post /api/v1/admin/finance/reminders/run Into sweep2 Using adminSession.accessToken
{}
Then AssertStatus sweep2 200

When Get /api/v1/admin/families/${fam.body.data.id}/communications Into comms2 Using adminSession.accessToken
Then AssertStatus comms2 200
And AssertJson comms2 "$.body.data[?(@.kind=='reminder_due')]" == 1
And AssertJson comms2 "$.body.data[?(@.kind=='dd_incomplete')]" == 1

# A manual reminder always sends (and again on repeat).
When Post /api/v1/admin/charges/${dueCharge.body.data.id}/remind Into manual1 Using adminSession.accessToken
{}
Then AssertStatus manual1 200
And Assert manual1.body.data.kind == "manual_reminder"

When Post /api/v1/admin/charges/${dueCharge.body.data.id}/remind Into manual2 Using adminSession.accessToken
{}
Then AssertStatus manual2 200

When Get /api/v1/admin/families/${fam.body.data.id}/communications Into comms3 Using adminSession.accessToken
Then AssertStatus comms3 200
And AssertJson comms3 "$.body.data[?(@.kind=='manual_reminder')]" == 2

# Settle the charge — reminding a settled charge is rejected.
When Post /api/v1/admin/families/${fam.body.data.id}/manual-payment Into pay Using adminSession.accessToken
{ "amount_pence": 20000 }
Then AssertStatus pay 201

When Post /api/v1/admin/charges/${dueCharge.body.data.id}/remind Into remindSettled Using adminSession.accessToken
{}
Then AssertStatus remindSettled 400

Teardown
Delete /api/v1/admin/parent-relationships/${rel.body.data.id} Using adminSession.accessToken
Delete /api/v1/admin/parents/${rel.body.data.parent_id} Using adminSession.accessToken
Delete /api/v1/admin/children/${remChild.id} Using adminSession.accessToken
```
