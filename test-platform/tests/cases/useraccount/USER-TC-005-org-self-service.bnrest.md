---
id: USER-TC-005
number: 2.7.5
type: Test Case
title: A super-admin can read and update their own org's profile, but platform-controlled fields like slug can't even be included in the request body
owner: QA
mode: Standalone
status: Active
tags:
  - useraccount
dependsOn: []
uses: []
fixtureScope: case
timeoutSeconds: 30
---

# Org self-service

New coverage (`SUI-USERACCOUNT-001`). `models.OrgProfileRequest` has no
`slug`/`plan`/`status`/`domains` fields at all, and `validator.DecodeJSON`
disallows unknown JSON keys everywhere in this codebase — so a caller
can't even attempt to smuggle those platform-controlled fields through
this route; the request is rejected outright, not silently trimmed. Reads
the shared `adminSession` suite fixture — see `SUI-USERACCOUNT-001`.

```bnrest
Given Get /api/v1/admin/organisation Into before Using adminSession.accessToken
Then AssertStatus before 200
And Assert before.body.data.slug != null

When Put /api/v1/admin/organisation Into updated Using adminSession.accessToken
{
  "name": "${before.body.data.name}",
  "branding": {"primary_color": "#123456"},
  "settings": {"timezone": "Europe/London", "currency": "GBP", "features": []}
}
Then AssertStatus updated 200
And Assert updated.body.data.slug == before.body.data.slug

When Put /api/v1/admin/organisation Into slugSmuggled Using adminSession.accessToken
{
  "name": "${before.body.data.name}",
  "slug": "qa-autotest-should-not-be-allowed"
}
Then AssertStatus slugSmuggled 400
```
