---
id: CAPACITY-TC-002
number: 2.10.2
type: Test Case
title: The branch capacity roll-up returns one summary per room and reconciles with the per-room endpoint
owner: QA
mode: Standalone
status: Active
tags:
  - capacity
dependsOn: []
uses: []
fixtureScope: case
timeoutSeconds: 30
---

# Branch capacity roll-up reconciles

New coverage (`SUI-CAPACITY-001`). Reads shared `adminSession`/`branch`/
`room` fixtures.

```bnrest
Given Get /api/v1/admin/rooms/capacity?branch=${branch.slug} Into rollup Using adminSession.accessToken
Then AssertStatus rollup 200
And AssertJson rollup "$.body.data[?(@.room_id=='${room.id}')].length()" == 1

When Get /api/v1/admin/rooms/${room.id}/capacity Into single Using adminSession.accessToken
Then AssertStatus single 200
CopyJson rollup "$.body.data[?(@.room_id=='${room.id}')]" Into rollupRoom
Then Assert rollupRoom.capacity == single.body.data.capacity
And Assert rollupRoom.available_spaces == single.body.data.available_spaces
