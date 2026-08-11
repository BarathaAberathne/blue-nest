---
id: FIN-TC-002
number: 2.31.2
type: Test Case
title: Manual payments auto-allocate oldest-first; mandate + paid first-payment charges flip the onboarding finance gate
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

# Payments & the onboarding gate

Self-contained: own child + parent + family. First-payment charges (deposit +
first month) gate onboarding; a partial manual payment settles oldest-first;
the offline mandate + full settlement flip the finance category to 100.

```bnrest
Setup
Set f2Suffix = random()
Call ../../utils/child/CHILD-UTIL-003-create-child-direct.bnrest.md With Json Into gateChild
{ "accessToken": "${adminSession.accessToken}", "branchSlug": "${branch.slug}", "firstName": "QA-AUTOTEST", "lastName": "FinGate-${f2Suffix}", "dob": "${today("-24m")}" }

Body
When Post /api/v1/admin/children/${gateChild.id}/parents Into rel Using adminSession.accessToken
{ "parent": { "first_name": "QA-AUTOTEST", "last_name": "GatePar-${f2Suffix}", "email": "qa-autotest-gatepar-${f2Suffix}@bluenest.test" }, "relationship": "father", "parental_responsibility": true, "billing_contact": true }
Then AssertStatus rel 201

When Post /api/v1/admin/children/${gateChild.id}/family Into fam Using adminSession.accessToken
{}
Then AssertStatus fam 200

# First payment with no amounts is rejected.
When Post /api/v1/admin/families/${fam.body.data.id}/first-payment Into fpBad Using adminSession.accessToken
{ "child_id": "${gateChild.id}", "due_date": "${today()}" }
Then AssertStatus fpBad 400

# Deposit £300 + first month £1200, due today → two gating charges.
When Post /api/v1/admin/families/${fam.body.data.id}/first-payment Into fp Using adminSession.accessToken
{ "child_id": "${gateChild.id}", "deposit_pence": 30000, "first_month_pence": 120000, "due_date": "${today()}" }
Then AssertStatus fp 201
And AssertJson fp "$.body.data[?(@.first_payment==true)]" == 2

# Finance category is 0 while nothing is paid and no mandate exists.
When Get /api/v1/admin/children/${gateChild.id}/onboarding Into onb0 Using adminSession.accessToken
Then AssertStatus onb0 200
And AssertJson onb0 "$.body.data.categories[?(@.key=='finance' && @.percent==0)]" == 1

# Manual £400 with NO allocations → auto-allocates oldest-first:
# deposit settled in full, first month partially paid £100.
When Post /api/v1/admin/families/${fam.body.data.id}/manual-payment Into pay1 Using adminSession.accessToken
{ "amount_pence": 40000, "note": "QA-AUTOTEST cash" }
Then AssertStatus pay1 201
And AssertJson pay1 "$.body.data.allocations" == 2

When Get /api/v1/admin/families/${fam.body.data.id} Into view1 Using adminSession.accessToken
Then AssertStatus view1 200
And AssertJson view1 "$.body.data.charges[?(@.status=='paid' && @.description=='Deposit')]" == 1
And AssertJson view1 "$.body.data.charges[?(@.status=='partially_paid' && @.paid_pence==10000)]" == 1
And AssertJson view1 "$.body.data.family.balance_pence" == 110000

# Offline (paper) mandate — the finance.adjust manager action.
When Post /api/v1/admin/families/${fam.body.data.id}/mandate Into mandate Using adminSession.accessToken
{ "reference": "QA-AUTOTEST-PAPER-${f2Suffix}" }
Then AssertStatus mandate 200
And Assert mandate.body.data.mandate_status == "active"

# Mandate active but first month unpaid → the gate stays shut.
When Get /api/v1/admin/children/${gateChild.id}/onboarding Into onb1 Using adminSession.accessToken
Then AssertStatus onb1 200
And AssertJson onb1 "$.body.data.categories[?(@.key=='finance' && @.percent==0)]" == 1

# Settle the remaining £1100 → every first-payment charge paid.
When Post /api/v1/admin/families/${fam.body.data.id}/manual-payment Into pay2 Using adminSession.accessToken
{ "amount_pence": 110000, "note": "QA-AUTOTEST bank transfer" }
Then AssertStatus pay2 201

When Get /api/v1/admin/families/${fam.body.data.id} Into view2 Using adminSession.accessToken
Then AssertStatus view2 200
And AssertJson view2 "$.body.data.family.balance_pence" == 0
And AssertJson view2 "$.body.data.charges[?(@.status=='paid')]" == 2

# The onboarding finance category flips to 100.
When Get /api/v1/admin/children/${gateChild.id}/onboarding Into onb2 Using adminSession.accessToken
Then AssertStatus onb2 200
And AssertJson onb2 "$.body.data.categories[?(@.key=='finance' && @.percent==100)]" == 1

# The finance dashboard aggregates without error.
When Get /api/v1/admin/finance/dashboard Into dash Using adminSession.accessToken
Then AssertStatus dash 200
And Assert dash.body.data.families_total != null
And Assert dash.body.data.outstanding_pence != null

Teardown
Delete /api/v1/admin/parent-relationships/${rel.body.data.id} Using adminSession.accessToken
Delete /api/v1/admin/parents/${rel.body.data.parent_id} Using adminSession.accessToken
Delete /api/v1/admin/children/${gateChild.id} Using adminSession.accessToken
```
