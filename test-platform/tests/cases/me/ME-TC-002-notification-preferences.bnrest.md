---
id: ME-TC-002
number: 2.24.2
type: Test Case
title: A user reads and edits their own notification email preferences
owner: QA
mode: Standalone
status: Active
tags:
  - me
  - regression
dependsOn: []
uses: []
fixtureScope: case
timeoutSeconds: 30
---

# Self-service notification email preferences

Covers `GET/PUT /me/notification-preferences` (per-user email opt-outs for
in-app notification delivery). Reads the shared `meSession` fixture (see
`SUI-ME-001`). The update whitelists to the catalogue and de-duplicates, so a
bogus type and a repeated valid type both collapse to one stored entry; an
empty list restores the default (everything emailed).

```bnrest
Given Get /api/v1/me/notification-preferences Into prefs Using meSession.accessToken
Then AssertStatus prefs 200
And AssertJson prefs "$.body.data.catalogue[?(@.type=='leave_approved')].length()" == 1
And AssertJson prefs "$.body.data.muted_types.length()" == 0

When Put /api/v1/me/notification-preferences Into muted Using meSession.accessToken
{ "muted_types": ["leave_approved", "bogus_type", "leave_approved"] }
Then AssertStatus muted 200
And AssertJson muted "$.body.data.muted_types.length()" == 1
And Assert muted.body.data.muted_types[0] == "leave_approved"

When Get /api/v1/me/notification-preferences Into reread Using meSession.accessToken
Then AssertStatus reread 200
And AssertJson reread "$.body.data.muted_types.length()" == 1

When Put /api/v1/me/notification-preferences Into reset Using meSession.accessToken
{ "muted_types": [] }
Then AssertStatus reset 200
And AssertJson reset "$.body.data.muted_types.length()" == 0
```
