# MIGRATION-TC-001 — legacy room_id → canonical assignments

**This is a migration test, not a permanent functional suite.** It verifies a
one-time schema/data transition; it is kept separate from the canonical
functional suites (which only exercise the final assignment model). Once every
environment has migrated and no source `room_id` scalar remains, this test's
job is done.

## What it covers

The `backend/cmd/migrateroomassignments` command, which converts the
pre-consolidation stored `child.room_id` / `staff.room_id` scalars into the
canonical `child_room_assignments` / `staff_room_assignments` collections and
then `$unset`s the obsolete scalar.

| Aspect | Expectation |
|---|---|
| Source data | children/staff carrying a stored `room_id` |
| Transformation | one active assignment per valid (same-branch) room; `left`/`inactive` people → ended history rows |
| Destination | canonical assignment rows; stored `room_id` `$unset` |
| No data loss | invalid-room / cross-branch values are **kept** on the source + logged, never discarded |
| Idempotency | re-running creates nothing new (`already-present`), unsets nothing more |
| Verification | `-verify` confirms no convertible stored `room_id` remains and every active assignment references a live child |

## How to run

```bash
cd backend
go run ./cmd/migrateroomassignments          # convert + $unset, prints a report
go run ./cmd/migrateroomassignments -verify   # parity check, non-zero exit on mismatch
# or, wrapped:
make migrate-room-assignments
```

## Verified result (local dev)

- First run on Famly-seeded data: 513/513 children converted, 0 invalid, 0
  cross-branch; stored `room_id` unset.
- Re-run: 0 migrated, 0 unset (idempotent).
- `-verify`: **OK** — no convertible stored `room_id` remains; every active
  assignment references a live child.

The canonical runtime behaviour these migrated rows then feed is covered by
the functional suites `SUI-STAFFROOM-001`, `SUI-CHILDROOM-001`,
`SUI-CAPACITY-001`, `SUI-ROOMAUDIT-001`, `SUI-ROOMNET-001` and the Go unit
tests in `internal/service/room_assignment_test.go`.
