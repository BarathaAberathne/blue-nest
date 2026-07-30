---
id: AUTH-UTIL-002
number: U.14
type: Test Util
title: Register a new customer account (auto-authenticated)
owner: QA Platform
mode: Standalone
status: Active
tags:
  - authentication
  - store
fixtureScope: case
timeoutSeconds: 30
---

# Register a customer

`POST /auth/register` (`internal/service/auth.go`'s `Register`) returns
the same `AuthResponse` shape as `/auth/login` — a fresh customer account
is immediately authenticated, no separate login call needed. Distinct
from `AUTH-UTIL-001` (`/admin/auth/login`, existing accounts only).
`.test` is an RFC 2606 reserved TLD, always exempt from this endpoint's
live email-deliverability DNS check, so `@bluenest.test` addresses are
safe here.

Inputs: `input.email`, `input.password`, `input.firstName`,
`input.lastName`.

```bnrest
Post /api/v1/auth/register Into registered
{
  "email": "${input.email}",
  "password": "${input.password}",
  "first_name": "${input.firstName}",
  "last_name": "${input.lastName}"
}

AssertStatus registered 201
Assert registered.body.data.access_token != null
Assert registered.body.data.user.id != null

Output
{
  "accessToken": "${registered.body.data.access_token}",
  "refreshToken": "${registered.body.data.refresh_token}",
  "userId": "${registered.body.data.user.id}",
  "email": "${registered.body.data.user.email}"
}
```
