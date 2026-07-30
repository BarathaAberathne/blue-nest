# Writing a Test Util

A **Test Util** (`type: Test Util`) is the one authoritative place a
reusable operation lives (spec §2/§6) — login, create-a-branch,
create-a-room, submit-an-enquiry, and so on. Test Cases `Call` it; they
never re-implement its request body, assertions, or token extraction.

## Rules

- **Inputs are explicit.** A Util only sees what its caller passes via
  `Call ... With Json`, bound as the `input` variable inside the Util's own
  **isolated** scope — never the caller's variables directly (spec §12).
- **Outputs are explicit.** Whatever the Util's `Output` block returns is
  the only thing the caller gets back (bound to whatever variable name the
  caller's `Into` clause names).
- **`fixtureScope`** controls reuse: `case` (default) re-runs the Util every
  time it's called; `suite` runs it once per suite and serves the same
  result to every caller with the *same* input (this is what stops many
  cases in one suite from each burning a fresh login); `run` shares across
  the entire run — only appropriate for read-only/immutable setup.

## Copyable example: the login utility

This is the real, working utility every authenticated test in this repo
calls (`test-platform/tests/utils/auth/AUTH-UTIL-001-login.bnrest.md`):

````markdown
---
id: AUTH-UTIL-001
number: U.1
type: Test Util
title: Authenticate an API user
owner: QA Platform
mode: Standalone
status: Active
tags:
  - authentication
fixtureScope: suite
timeoutSeconds: 30
---

# Authenticate an API user

```bnrest
Post /api/v1/admin/auth/login Into loginResponse
{
  "email": "${input.email}",
  "password": "${input.password}"
}

AssertStatus loginResponse 200
Assert loginResponse.body.data.access_token != null
Assert loginResponse.body.data.user.id != null

Output
{
  "accessToken": "${loginResponse.body.data.access_token}",
  "refreshToken": "${loginResponse.body.data.refresh_token}",
  "userId": "${loginResponse.body.data.user.id}",
  "role": "${loginResponse.body.data.user.role}",
  "email": "${loginResponse.body.data.user.email}"
}
```
````

Note it does **not** resolve `${secret:...}` itself — the calling test
decides whether to pass a real secret-resolved password (the golden-path
case) or a deliberately wrong one (a negative test) — see
`writing-tests.md`'s negative-test example, which calls this exact same
utility.

## Why not use `${secret:...}` inside the utility

A utility that's credential-agnostic can be reused for BOTH "log in
successfully" and "prove a bad password is rejected" tests — hard-coding a
secret lookup inside the utility would make the second use case impossible
without a separate near-duplicate utility. Resolve secrets at the call site
that legitimately needs the real credential.
