---
id: PORTAL-TC-001
number: 2.34.1
type: Test Case
title: Parent login resolves to the authorised children only; admin login stays rejected
owner: QA
mode: Standalone
status: Active
tags: [portal, regression]
dependsOn: []
uses: []
fixtureScope: case
timeoutSeconds: 30
---

# Parent resolution

```bnrest
Body
# The portal children list contains exactly the linked child.
When Get /api/v1/portal/children Into kids Using parentToken
Then AssertStatus kids 200
And AssertJson kids "$.body.data[?(@.id=='${child.id}')]" == 1
And AssertJson kids "$.body.data[?(@.id=='${otherChild.id}')]" == 0

# Parent identity resolves with the relationship attached.
When Get /api/v1/portal/me Into me Using parentToken
Then AssertStatus me 200
And AssertJson me "$.body.data.children[?(@.child_id=='${child.id}')]" == 1

# The staff/admin boundary holds: a parent cannot use the management login.
When Post /api/v1/admin/auth/login Into adminAttempt
{ "email": "qa-autotest-portalpar-${portalSuffix}@bluenest.test", "password": "PortalSuite2026!" }
Then AssertStatus adminAttempt 401
```
