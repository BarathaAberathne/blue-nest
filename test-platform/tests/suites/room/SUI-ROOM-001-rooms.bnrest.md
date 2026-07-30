---
id: SUI-ROOM-001
number: "1.3"
type: Test Suite
title: Room Management
owner: QA
mode: Standalone
status: Active
tags:
  - room
---

# Room Management suite

`ROOM-TC-001` verifies the real, live Harrow branch's actual pre-existing
rooms (genuinely environment-specific, per `test-platform-architecture.md`
"Exceptions" — not yet physically moved to `COL-CONFIG-001`).
`ROOM-TC-002..007` are branch-independent generic behaviour — each creates
its own throwaway branch via `BRANCH-FIX-001`/`002` rather than using
Harrow, and runs fully independently (spec §13: no shared branch/room
state between cases).

```bnrest
Call CatchError ../../cases/room/ROOM-TC-001-existing-rooms-valid.bnrest.md
Call CatchError ../../cases/room/ROOM-TC-002-create-valid-room.bnrest.md
Call CatchError ../../cases/room/ROOM-TC-003-zero-capacity-rejected.bnrest.md
Call CatchError ../../cases/room/ROOM-TC-004-negative-capacity-rejected.bnrest.md
Call CatchError ../../cases/room/ROOM-TC-005-duplicate-name-rejected.bnrest.md
Call CatchError ../../cases/room/ROOM-TC-006-cross-branch-name-allowed.bnrest.md
Call CatchError ../../cases/room/ROOM-TC-007-missing-name-rejected.bnrest.md
```
