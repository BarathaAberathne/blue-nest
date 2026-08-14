---
id: PORTAL-TC-002
number: 2.34.2
type: Test Case
title: Parent attendance view — own child only, parent-safe fields only
owner: QA
mode: Standalone
status: Active
tags: [portal, security, regression]
dependsOn: []
uses: []
fixtureScope: case
timeoutSeconds: 30
---

# Attendance access

Canonical attendance records, projected without staff fields; another
family's child 404s without leaking existence.

```bnrest
Setup
# Check the child in via the canonical staff endpoint.
Post /api/v1/admin/attendance/check-in Into checkin Using adminSession.accessToken
{ "child_id": "${child.id}", "date": "${today()}" }
AssertStatus checkin 200

Body
When Get /api/v1/portal/children/${child.id}/attendance Into att Using parentToken
Then AssertStatus att 200
And AssertJson att "$.body.data[?(@.date=='${today()}')]" == 1

# Parent-safe projection: no staff names, notes or internal fields.
When Get /api/v1/portal/children/${child.id}/attendance Into attRows Using parentToken
Then AssertJson attRows "$.body.data[?(@.checked_in_by || @.notes || @.child_name)]" == 0

# Another family's child is a 404, not a 403 (no information leak).
When Get /api/v1/portal/children/${otherChild.id}/attendance Into foreign Using parentToken
Then AssertStatus foreign 404
```
