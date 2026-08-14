---
id: EXPORT-TC-003
number: 2.28.3
type: Test Case
title: The full child profile streams as a PDF attachment
owner: QA
mode: Standalone
status: Active
tags:
  - export
  - regression
dependsOn: []
uses: []
fixtureScope: case
timeoutSeconds: 30
---

# Child profile PDF export

`GET /admin/children/{id}/profile.pdf` composes the FULL profile (identity,
contacts, induction answers, consents, SEND for send.manage callers) into a
server-rendered PDF — the first Phase-E PDF export. Locks the endpoint's
existence + success for a real child; a bogus id is a 404, never a broken
document. Reads the shared `adminSession` fixture (see `SUI-EXPORT-001`).

```bnrest
When Get /api/v1/admin/children Into kids Using adminSession.accessToken
Then AssertStatus kids 200
And CopyJson kids "$.body.data[0]" Into firstChild

When Get /api/v1/admin/children/${firstChild.id}/profile.pdf Into pdf Using adminSession.accessToken
Then AssertStatus pdf 200

When Get /api/v1/admin/children/000000000000000000000000/profile.pdf Into missing Using adminSession.accessToken
Then AssertStatus missing 404
```
