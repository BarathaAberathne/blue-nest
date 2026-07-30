---
id: SUI-PROCUREMENT-001
number: "2.6"
type: Test Suite
title: Procurement (Supply Requests, Catalogue, Purchase Orders, Suppliers, Analytics, Templates)
owner: QA
mode: Standalone
status: Active
tags:
  - procurement
---

# Procurement suite

New coverage (no legacy equivalent). Verified against
`internal/models/{order_request,catalogue_item,purchase_cart,supplier,order_template}.go`,
`internal/service/{order_request,catalogue_item,purchase_cart,supplier,
order_template,procurement_analytics}.go`. `Setup` creates one admin
login, a dynamic branch, and one staff member (with a login, since supply
requests are staff-facing) shared by every case.

**Live sourcing against real suppliers (`GompelsAdapter`/`AmazonAdapter`)
is not exercised** — both are gated off by default
(`GOMPELS_SEARCH_ENABLED`/`AMAZON_BUSINESS_ENABLED`) in this environment,
so `PROC-TC-008`/`009`'s generated cart lines come from the catalogue
cache / raw item name, not a live web search; this matches how the
feature actually runs in CI/local dev.

```bnrest
Setup
Call ../../utils/auth/AUTH-UTIL-001-login.bnrest.md With Json Into adminSession
{
  "email": "admin@bluenest.uk",
  "password": "${secret:QA_ADMIN_PASSWORD}"
}

Call ../../utils/branch/BRANCH-FIX-001-create-test-branch.bnrest.md With Json Into branch
{
  "accessToken": "${adminSession.accessToken}"
}

Set staffSuffix = random()
Call ../../utils/staff/STAFF-UTIL-001-create-staff.bnrest.md With Json Into staff
{
  "accessToken": "${adminSession.accessToken}",
  "firstName": "QA-AUTOTEST",
  "lastName": "ProcurementStaff-${staffSuffix}",
  "email": "qa-autotest-procurementstaff-${staffSuffix}@bluenest.test",
  "branchSlug": "${branch.slug}",
  "jobTitle": "",
  "enableLogin": true,
  "loginRole": "staff",
  "loginPassword": "ProcurementStaff2027!"
}
Call ../../utils/auth/AUTH-UTIL-001-login.bnrest.md With Json Into staffSession
{
  "email": "qa-autotest-procurementstaff-${staffSuffix}@bluenest.test",
  "password": "ProcurementStaff2027!"
}

Body
Call CatchError ../../cases/procurement/PROC-TC-001-submit-request-sanitizes-items.bnrest.md
Call CatchError ../../cases/procurement/PROC-TC-002-own-requests-list-and-ownership.bnrest.md
Call CatchError ../../cases/procurement/PROC-TC-003-cancel-own-pending-request.bnrest.md
Call CatchError ../../cases/procurement/PROC-TC-004-admin-status-update-no-state-machine.bnrest.md
Call CatchError ../../cases/procurement/PROC-TC-005-catalogue-crud-and-staff-visibility.bnrest.md
Call CatchError ../../cases/procurement/PROC-TC-006-catalogue-learn-upserts-by-name.bnrest.md
Call CatchError ../../cases/procurement/PROC-TC-007-supplier-crud.bnrest.md
Call CatchError ../../cases/procurement/PROC-TC-008-generate-cart-and-edit-while-draft.bnrest.md
Call CatchError ../../cases/procurement/PROC-TC-009-place-fulfill-and-receive.bnrest.md
Call CatchError ../../cases/procurement/PROC-TC-010-order-templates.bnrest.md
Call CatchError ../../cases/procurement/PROC-TC-011-analytics-well-formed.bnrest.md

Teardown
Delete /api/v1/admin/staff/${staff.id} Using adminSession.accessToken
Delete /api/v1/admin/users/${staff.userId} Using adminSession.accessToken
Call ../../utils/branch/BRANCH-FIX-002-archive-test-branch.bnrest.md With Json Into cleanup
{
  "accessToken": "${adminSession.accessToken}",
  "slug": "${branch.slug}"
}
```
