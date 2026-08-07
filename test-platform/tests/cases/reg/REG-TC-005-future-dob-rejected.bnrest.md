---
id: REG-TC-005
number: 1.5.6
type: Test Case
title: Registration with a future date of birth is rejected before the status flips
owner: QA
mode: Standalone
status: Active
tags:
  - registration
  - regression
dependsOn: []
uses: []
fixtureScope: case
timeoutSeconds: 30
---

# Future DOB rejected (validation regression lock)

Found in the live-UI E2E pass: registration accepted any DOB, so a year-typo
could create a child born in the future. `dobNotInFuture` now guards enquiry
Register (before the enquiry's status flips — the handler creates the Child
AFTER registering) plus child Create/Update/EnsureFromEnquiry. Reads the
shared `adminSession`/`branch` fixtures (see `SUI-REG-001`).

```bnrest
Setup
Set dobSuffix = random()
Post /api/v1/admin/enquiries Into futureEnquiry Using adminSession.accessToken
{
  "name": "QA-AUTOTEST FutureDOB-${dobSuffix}",
  "email": "qa-autotest-futuredob-${dobSuffix}@bluenest.test",
  "phone": "07000000005",
  "branch": "${branch.slug}",
  "enquiry_type": "Application form",
  "source": "phone"
}
AssertStatus futureEnquiry 201

Body
When Post /api/v1/admin/enquiries/${futureEnquiry.body.data.id}/register Into rejected Using adminSession.accessToken
{
  "registration_date": "${today("-1w")}T00:00:00Z",
  "expected_start_date": "${today("+1m")}T00:00:00Z",
  "child_age_group": "Under 1 year",
  "funding_type": "None",
  "child_first_name": "QA-AUTOTEST",
  "child_last_name": "FutureDOB-${dobSuffix}",
  "child_dob": "${today("+2y")}",
  "child_gender": ""
}
Then AssertStatus rejected 400
And Assert rejected.body.error == "date of birth cannot be in the future"

# The enquiry must NOT have been flipped to registered by the failed attempt.
When Get /api/v1/admin/enquiries/${futureEnquiry.body.data.id} Into after Using adminSession.accessToken
Then AssertStatus after 200
And Assert after.body.data.status != "registered"
```
