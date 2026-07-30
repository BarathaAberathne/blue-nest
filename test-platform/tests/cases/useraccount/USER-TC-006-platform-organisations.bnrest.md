---
id: USER-TC-006
number: 2.7.6
type: Test Case
title: Only a platform_super_admin can create a tenant organisation; a regular super_admin is rejected; slug format and duplicates are validated
owner: QA
mode: Standalone
status: Active
tags:
  - useraccount
  - golden-path
dependsOn: []
uses: []
fixtureScope: case
timeoutSeconds: 30
---

# Platform organisations (cross-tenant)

New coverage (`SUI-USERACCOUNT-001`). Verified against
`internal/handler/admin/organisations.go`. `platform_super_admin` is a
regular assignable role via `POST /admin/users` (it's in
`models.ManagementRoles`), so this case provisions its own throwaway
platform operator rather than needing a pre-seeded one. Reads the shared
`adminSession` suite fixture — see `SUI-USERACCOUNT-001`.

```bnrest
Setup
Set platformSuffix = random()
Post /api/v1/admin/users Into platformUser Using adminSession.accessToken
{
  "email": "qa-autotest-platformop-${platformSuffix}@bluenest.test",
  "password": "PlatformOp2027!",
  "first_name": "QA-AUTOTEST",
  "last_name": "PlatformOp",
  "role": "platform_super_admin"
}
AssertStatus platformUser 201

Call ../../utils/auth/AUTH-UTIL-001-login.bnrest.md With Json Into platformSession
{
  "email": "qa-autotest-platformop-${platformSuffix}@bluenest.test",
  "password": "PlatformOp2027!"
}

Body
When Post /api/v1/admin/organisations Into rejectedForRegularAdmin Using adminSession.accessToken
{
  "slug": "qa-autotest-org-${platformSuffix}-should-not-be-created",
  "name": "QA-AUTOTEST Should Not Exist"
}
Then AssertStatus rejectedForRegularAdmin 403

When Post /api/v1/admin/organisations Into badSlug Using platformSession.accessToken
{
  "slug": "Not A Valid Slug!",
  "name": "QA-AUTOTEST Bad Slug Org"
}
Then AssertStatus badSlug 400

When Post /api/v1/admin/organisations Into created Using platformSession.accessToken
{
  "slug": "qa-autotest-org-${platformSuffix}",
  "name": "QA-AUTOTEST Org ${platformSuffix}"
}
Then AssertStatus created 201

When Post /api/v1/admin/organisations Into duplicate Using platformSession.accessToken
{
  "slug": "${created.body.data.slug}",
  "name": "QA-AUTOTEST Duplicate Slug Org"
}
Then AssertStatus duplicate 400

When Get /api/v1/admin/organisations Into list Using platformSession.accessToken
Then AssertStatus list 200
And AssertJson list "$.body.data[?(@.slug=='${created.body.data.slug}')].length()" == 1

Teardown
Delete /api/v1/admin/users/${platformUser.body.data.id} Using adminSession.accessToken
```
