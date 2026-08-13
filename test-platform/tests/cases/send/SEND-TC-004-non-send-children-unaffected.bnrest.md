---
id: SEND-TC-004
number: 2.32.4
type: Test Case
title: Existing children without SEND information behave exactly as before
owner: QA
mode: Standalone
status: Active
tags: [send, regression]
dependsOn: []
uses: [CHILD-UTIL-003]
fixtureScope: case
timeoutSeconds: 30
---

# Non-SEND children unaffected

A fresh child has no send_status, a null profile, a working normal update, and
the child update DTO cannot smuggle send_status in (DisallowUnknownFields).

```bnrest
Setup
Set plainSuffix = random()
Call ../../utils/child/CHILD-UTIL-003-create-child-direct.bnrest.md With Json Into plain
{ "accessToken": "${adminSession.accessToken}", "branchSlug": "${branch.slug}", "firstName": "QA-AUTOTEST", "lastName": "Plain-${plainSuffix}", "dob": "${today("-24m")}" }

Body
When Get /api/v1/admin/children/${plain.id} Into rec Using adminSession.accessToken
Then AssertStatus rec 200
And AssertJson rec "$.body[?(@.data && !@.data.send_status)]" == 1

When Get /api/v1/admin/children/${plain.id}/send-support Into prof Using adminSession.accessToken
Then AssertStatus prof 200
And Assert prof.body.data == null

# Normal update still works and does not create SEND data.
When Put /api/v1/admin/children/${plain.id} Into upd Using adminSession.accessToken
{ "first_name": "QA-AUTOTEST", "last_name": "Plain-${plainSuffix}", "branch_slug": "${branch.slug}", "gender": "male" }
Then AssertStatus upd 200
And AssertJson upd "$.body[?(@.data && !@.data.send_status)]" == 1

# send_status is not a child-update field — unknown fields are rejected.
When Put /api/v1/admin/children/${plain.id} Into smuggle Using adminSession.accessToken
{ "first_name": "QA-AUTOTEST", "last_name": "Plain-${plainSuffix}", "branch_slug": "${branch.slug}", "send_status": "ehcp" }
Then AssertStatus smuggle 400

Teardown
Delete /api/v1/admin/children/${plain.id} Using adminSession.accessToken
```
