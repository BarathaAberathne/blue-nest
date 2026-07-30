---
id: AUTH-TC-004
number: 1.1.4
type: Test Case
title: A sweep of malformed/invalid login credentials is rejected
owner: QA
mode: Standalone
status: Active
tags:
  - authentication
  - regression
dependsOn: []
uses:
  - AUTH-UTIL-001
fixtureScope: case
timeoutSeconds: 30
dataFile: ../../data/auth/DATA-AUTH-001-invalid-credentials.csv
---

# Data-driven invalid-credential sweep

No 1:1 legacy equivalent (see `test-platform/migration-manifest.json` —
`AUTH-TC-004` has no `legacyClass`/`legacyMethod`, only `note`) — new
coverage added during migration, driven by
`../../data/auth/DATA-AUTH-001-invalid-credentials.csv`. The runner
produces one dynamic test per CSV row (`AUTH-TC-004#row1` .. `#row4`), each
binding `${input.email}`/`${input.password}` from that row. This is the
copyable "CSV-driven test" example referenced in
`docs/testing/writing-tests.md`.

```bnrest
Given ExpectFail Call ../../utils/auth/AUTH-UTIL-001-login.bnrest.md With Json Into session
{
  "email": "${input.email}",
  "password": "${input.password}"
}
```
