---
id: INDUCT-TC-001
number: 2.30.1
type: Test Case
title: Section save/resume persists, allergies write through to the Child, submit is gated, review is four-eyes
owner: QA
mode: Standalone
status: Active
tags:
  - induction
  - regression
dependsOn: []
uses: []
fixtureScope: case
timeoutSeconds: 40
---

# Sections, write-through and four-eyes review

```bnrest
Body
# Partial save persists (save & resume) and moves status to in_progress.
When Put /api/v1/admin/children/${child.id}/induction/sections/routine Into saved Using adminSession.accessToken
{ "data": { "sleep_pattern": "Naps 1-3pm", "pacifier": "yes" }, "complete": false }
Then AssertStatus saved 200
And Assert saved.body.data.status == "in_progress"

When Get /api/v1/admin/children/${child.id}/induction Into fetched Using adminSession.accessToken
Then AssertStatus fetched 200
And AssertJson fetched "$.body.data.induction.sections.routine.data.sleep_pattern" == "Naps 1-3pm"

# The allergies section WRITES THROUGH to the canonical Child fields.
When Put /api/v1/admin/children/${child.id}/induction/sections/allergies_dietary Into wt Using adminSession.accessToken
{ "data": { "allergy_tags": ["peanuts"], "allergies": "Mild peanut allergy", "dietary_tags": ["halal"], "medical_notes": "Carries antihistamine" }, "complete": true }
Then AssertStatus wt 200

When Get /api/v1/admin/children/${child.id} Into childAfter Using adminSession.accessToken
Then AssertStatus childAfter 200
And AssertJson childAfter "$.body.data.allergy_tags[0]" == "peanuts"
And Assert childAfter.body.data.allergies == "Mild peanut allergy"
And Assert childAfter.body.data.medical_notes == "Carries antihistamine"

# Submitting with required sections missing is rejected.
When Post /api/v1/admin/children/${child.id}/induction/submit Into early Using adminSession.accessToken
Then AssertStatus early 400

# Complete every required section, then submit succeeds.
When Put /api/v1/admin/children/${child.id}/induction/sections/child_details Into s1 Using adminSession.accessToken
{ "data": { "address": "42 Test Gardens, Harrow" }, "complete": true }
Then AssertStatus s1 200
When Put /api/v1/admin/children/${child.id}/induction/sections/family Into s2 Using adminSession.accessToken
{ "data": { "lives_with": "Both parents" }, "complete": true }
Then AssertStatus s2 200
When Put /api/v1/admin/children/${child.id}/induction/sections/professionals Into s3 Using adminSession.accessToken
{ "data": { "gp_name": "Dr Test", "nhs_number": "999 999 9999" }, "complete": true }
Then AssertStatus s3 200
When Put /api/v1/admin/children/${child.id}/induction/sections/collectors Into s4 Using adminSession.accessToken
{ "data": { "collection_password": "bluebird" }, "complete": true }
Then AssertStatus s4 200
When Put /api/v1/admin/children/${child.id}/induction/sections/health Into s5 Using adminSession.accessToken
{ "data": { "immunisations_confirmed": true }, "complete": true }
Then AssertStatus s5 200
When Put /api/v1/admin/children/${child.id}/induction/sections/cultural Into s6 Using adminSession.accessToken
{ "data": { "languages": "English, Italian" }, "complete": true }
Then AssertStatus s6 200
When Put /api/v1/admin/children/${child.id}/induction/sections/routine Into s7 Using adminSession.accessToken
{ "data": { "sleep_pattern": "Naps 1-3pm" }, "complete": true }
Then AssertStatus s7 200
When Put /api/v1/admin/children/${child.id}/induction/sections/development Into s8 Using adminSession.accessToken
{ "data": { "sen": "none" }, "complete": true }
Then AssertStatus s8 200

# The write-through address landed on the child record too.
When Get /api/v1/admin/children/${child.id} Into childAddr Using adminSession.accessToken
Then Assert childAddr.body.data.address == "42 Test Gardens, Harrow"

When Post /api/v1/admin/children/${child.id}/induction/submit Into submitted Using adminSession.accessToken
Then AssertStatus submitted 200
And Assert submitted.body.data.status == "submitted"

# Four-eyes: the submitter cannot review their own submission.
When Post /api/v1/admin/children/${child.id}/induction/review Into selfReview Using adminSession.accessToken
{ "note": "looks good" }
Then AssertStatus selfReview 400

# A different manager signs off.
When Post /api/v1/admin/children/${child.id}/induction/review Into reviewed Using reviewerSession.accessToken
{ "note": "Checked against the paper form" }
Then AssertStatus reviewed 200
And Assert reviewed.body.data.status == "reviewed"

# A reviewed induction refuses further edits.
When Put /api/v1/admin/children/${child.id}/induction/sections/routine Into locked Using adminSession.accessToken
{ "data": { "sleep_pattern": "changed" }, "complete": true }
Then AssertStatus locked 400
```
