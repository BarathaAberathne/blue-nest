---
id: FIN-TC-001
number: 2.31.1
type: Test Case
title: Family accounts derive from parent relationships; siblings share one family; balances derive from charges
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

# Family + charges

Ensure-family requires a linked parent, prefers the billing contact, joins a
sibling to the SAME family, and charge validation + balance derivation hold.

```bnrest
Setup
Set f1Suffix = random()
Call ../../utils/child/CHILD-UTIL-003-create-child-direct.bnrest.md With Json Into sibling
{ "accessToken": "${adminSession.accessToken}", "branchSlug": "${branch.slug}", "firstName": "QA-AUTOTEST", "lastName": "FinSib-${f1Suffix}", "dob": "${today("-18m")}" }

Body
# No parent linked yet — the family cannot be built.
When Post /api/v1/admin/children/${child.id}/family Into noParent Using adminSession.accessToken
{}
Then AssertStatus noParent 400

# Link the billing parent, then ensure the family.
When Post /api/v1/admin/children/${child.id}/parents Into rel Using adminSession.accessToken
{ "parent": { "first_name": "QA-AUTOTEST", "last_name": "FinPar-${f1Suffix}", "email": "qa-autotest-finpar-${f1Suffix}@bluenest.test" }, "relationship": "mother", "parental_responsibility": true, "billing_contact": true }
Then AssertStatus rel 201

When Post /api/v1/admin/children/${child.id}/family Into fam Using adminSession.accessToken
{}
Then AssertStatus fam 200
And AssertJson fam "$.body.data.billing_parent_id" == "${rel.body.data.parent_id}"
And Assert fam.body.data.mandate_status == ""

# Ensure is idempotent — same family id back.
When Post /api/v1/admin/children/${child.id}/family Into famAgain Using adminSession.accessToken
{}
Then AssertStatus famAgain 200
And AssertJson famAgain "$.body.data.id" == "${fam.body.data.id}"

# The sibling (same parent) joins the SAME family.
When Post /api/v1/admin/children/${sibling.id}/parents Into relSib Using adminSession.accessToken
{ "parent": { "first_name": "QA-AUTOTEST", "last_name": "FinPar-${f1Suffix}", "email": "qa-autotest-finpar-${f1Suffix}@bluenest.test" }, "relationship": "mother", "billing_contact": true }
Then AssertStatus relSib 201
And AssertJson relSib "$.body.data.parent_id" == "${rel.body.data.parent_id}"

When Post /api/v1/admin/children/${sibling.id}/family Into famSib Using adminSession.accessToken
{}
Then AssertStatus famSib 200
And AssertJson famSib "$.body.data.id" == "${fam.body.data.id}"

# Charge validation: zero amount, bad date, a child outside the family.
When Post /api/v1/admin/families/${fam.body.data.id}/charges Into badAmount Using adminSession.accessToken
{ "description": "Bad", "amount_pence": 0, "due_date": "${today("+1w")}" }
Then AssertStatus badAmount 400

When Post /api/v1/admin/families/${fam.body.data.id}/charges Into badDate Using adminSession.accessToken
{ "description": "Bad", "amount_pence": 1000, "due_date": "not-a-date" }
Then AssertStatus badDate 400

When Post /api/v1/admin/families/${fam.body.data.id}/charges Into strangerChild Using adminSession.accessToken
{ "child_id": "6100000000000000000000aa", "description": "Bad", "amount_pence": 1000, "due_date": "${today("+1w")}" }
Then AssertStatus strangerChild 400

# Two real charges: £300 due in a week + £500 next month.
When Post /api/v1/admin/families/${fam.body.data.id}/charges Into c1 Using adminSession.accessToken
{ "child_id": "${child.id}", "description": "QA-AUTOTEST deposit-like", "amount_pence": 30000, "due_date": "${today("+1w")}" }
Then AssertStatus c1 201
And Assert c1.body.data.status == "upcoming"
And Assert c1.body.data.ref != null

When Post /api/v1/admin/families/${fam.body.data.id}/charges Into c2 Using adminSession.accessToken
{ "child_id": "${sibling.id}", "description": "QA-AUTOTEST monthly", "amount_pence": 50000, "due_date": "${today("+4w")}" }
Then AssertStatus c2 201

# The family view derives the balance and resolves child names.
When Get /api/v1/admin/families/${fam.body.data.id} Into view Using adminSession.accessToken
Then AssertStatus view 200
And AssertJson view "$.body.data.family.balance_pence" == 80000
And AssertJson view "$.body.data.charges[?(@.child_name!='')]" == 2
And AssertJson view "$.body.data.next_payment.id" == "${c1.body.data.id}"

# The families list carries the derived balance + billing parent name.
When Get /api/v1/admin/families Into list Using adminSession.accessToken
Then AssertStatus list 200
And AssertJson list "$.body.data[?(@.id=='${fam.body.data.id}' && @.balance_pence==80000)]" == 1

Teardown
Delete /api/v1/admin/parent-relationships/${relSib.body.data.id} Using adminSession.accessToken
Delete /api/v1/admin/children/${sibling.id} Using adminSession.accessToken
```
