---
id: FEE-TC-001
number: 2.25.1
type: Test Case
title: The public fee-config bundle returns branch rates + meta
owner: QA
mode: Standalone
status: Active
tags:
  - fees
  - regression
dependsOn: []
uses: []
fixtureScope: case
timeoutSeconds: 30
---

# Public fee-config bundle

The unauthenticated calculator endpoint returns branch rates keyed by slug plus
the org-wide meta (pinned to the default tenant by middleware).

```bnrest
When Get /api/v1/fee-config Into bundle
Then AssertStatus bundle 200
And Assert bundle.body.data.branches.harrow.earlyBird != null
And Assert bundle.body.data.meta.note != null
```
