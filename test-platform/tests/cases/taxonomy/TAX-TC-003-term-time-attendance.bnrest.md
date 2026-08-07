---
id: TAX-TC-003
number: 2.21.3
type: Test Case
title: A term-time-only staff member is not expected (nor counted absent) outside term dates
owner: QA
mode: Standalone
status: Active
tags:
  - taxonomy
  - staffatt
  - regression
dependsOn: []
uses: []
fixtureScope: case
timeoutSeconds: 45
---

# Term-time-only staff excluded outside term dates

Regression lock for term-aware attendance: a dedicated branch gets a term
covering Jan 2027 and one term-time-only staff member. Inside the term the
staff member is expected (counts toward the roster/absent); outside it they
are excluded entirely, so the branch summary total is lower. Reads the
shared `adminSession` fixture (see `SUI-TAXONOMY-001`).

```bnrest
Setup
Call ../../utils/branch/BRANCH-FIX-001-create-test-branch.bnrest.md With Json Into branch
{ "accessToken": "${adminSession.accessToken}" }

Post /api/v1/admin/terms Into term Using adminSession.accessToken
{ "branch_slug": "${branch.slug}", "name": "QA-AUTOTEST Term", "start_date": "${monday("+20w")}", "end_date": "${monday("+24w+4d")}" }
AssertStatus term 201

Post /api/v1/admin/staff Into staff Using adminSession.accessToken
{ "first_name": "QA-AUTOTEST", "last_name": "TermOnly-${random()}", "branch_slug": "${branch.slug}", "staff_type": "permanent", "status": "active", "term_time_only": true }
AssertStatus staff 201

Body
When Get /api/v1/admin/staff-attendance/summary?date=${monday("+22w")}&branch=${branch.slug} Into inTerm Using adminSession.accessToken
Then AssertStatus inTerm 200
And Assert inTerm.body.data.total == 1

When Get /api/v1/admin/staff-attendance/summary?date=${monday("+40w")}&branch=${branch.slug} Into outTerm Using adminSession.accessToken
Then AssertStatus outTerm 200
And Assert outTerm.body.data.total == 0

Teardown
Delete /api/v1/admin/staff/${staff.body.data.id} Using adminSession.accessToken
Delete /api/v1/admin/terms/${term.body.data.id} Using adminSession.accessToken
Call ../../utils/branch/BRANCH-FIX-002-archive-test-branch.bnrest.md With Json Into cleanup
{ "accessToken": "${adminSession.accessToken}", "slug": "${branch.slug}" }
```
