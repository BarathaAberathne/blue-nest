# Room-allocation data migration plan

Migrates the legacy single-value `child.room_id` / `staff.room_id`
strings into the authoritative assignment collections. Implemented as
`backend/cmd/migrateroomassignments` (run via
`make migrate-room-assignments`), following the same conventions as
`cmd/migratetenancy` (idempotent, report-printing, never destructive).

## What it does

For every **child** with a non-empty `room_id`:

1. Resolve the room. If the room does not exist → log
   `INVALID (room not found)`, keep the legacy value untouched, count it
   in the report. **Never silently discard.**
2. If the room's branch ≠ the child's branch → log `CROSS-BRANCH`, keep
   the legacy value, count it.
3. Otherwise **upsert** a `ChildRoomAssignment`: `status=active`,
   `start_date` = the child's `start_date` when set, else the child's
   `created_at` date; `created_by = "migration:room-assignments"`.
   Children with status `left` get `status=ended` +
   `end_date = updated_at` date instead, preserving history without
   inflating current occupancy.

For every **staff** member with a non-empty `room_id`: same shape,
`is_primary=true`, `role_in_room=""` (0 rows in the current local data,
implemented anyway for other environments).

## Safety properties

- **Idempotent**: before creating, the tool looks for an existing
  assignment for the same (entity, room) created by the migration or
  otherwise active — re-running never duplicates (the partial unique
  indexes are a second line of defence).
- **Non-destructive**: legacy `room_id` values are **not cleared** by the
  migration. They remain as the derived read model, which the assignment
  service keeps in sync from then on. Parity between legacy field and
  active assignment is checked by the verification step below.
- **Reversible**: rollback = drop the two assignment collections
  (`db.staff_room_assignments.drop()`, `db.child_room_assignments.drop()`)
  — the legacy fields still hold the pre-migration state because the
  migration never wrote to them.
- **Report**: prints per-collection counts — migrated, already-present
  (idempotent skip), invalid-room, cross-branch, ended-history — and
  exits non-zero on any unexpected error.

## Verification (run after migrating)

`make migrate-room-assignments` is followed by a verify pass (same
binary, `-verify` flag) that recounts: every child with a legacy
`room_id` and an existing valid room must have exactly one
active/ended assignment matching that room, and every active assignment's
room must match the child's derived `room_id`. Mismatches are listed and
the command exits non-zero.

## Deprecation path for the legacy fields

Phase 1 (this change): fields stay, become service-synced derived read
models; all writes flow through the assignment services (the legacy PUT
`room_id` path delegates). Phase 2 (future, once all consumers read the
assignment endpoints): drop the fields from the API responses; Phase 3:
remove from the models. Tracked in `room-allocation-design.md`.
