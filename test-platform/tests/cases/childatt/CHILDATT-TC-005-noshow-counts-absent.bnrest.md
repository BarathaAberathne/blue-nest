---
id: CHILDATT-TC-005
number: 1.10.21
type: Test Case
title: A child who never checks in counts as absent (no-shows are visible, not only explicit absences)
owner: QA
mode: Standalone
status: Active
tags:
  - childatt
  - regression
dependsOn: []
uses: []
fixtureScope: case
timeoutSeconds: 30
---

# No-shows count as absent

Regression lock for the finding that the child attendance day-stats counted
`absent` only from records explicitly marked absent/sick/holiday, so a child
who simply never checked in was invisible in the absent figure (it showed 0
while the rate reflected the missing child). `absent` is now the residual
`expected − present`, matching the staff summary, so a no-show is counted.
Uses a dedicated future date on which the suite's child never checks in, in
its own scoped branch — so `present` is 0 and `absent` must be at least 1.
Reads the shared `adminSession`/`branch` fixtures — see `SUI-ATT-001`.

```bnrest
Given Get /api/v1/admin/attendance/today?date=${today("+38w")}&branch=${branch.slug} Into today Using adminSession.accessToken
Then AssertStatus today 200
And Assert today.body.data.expected >= 1
And Assert today.body.data.present == 0
And Assert today.body.data.absent >= 1
```
