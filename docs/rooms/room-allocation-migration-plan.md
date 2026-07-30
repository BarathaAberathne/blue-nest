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
- **Non-destructive per record**: the stored `room_id` scalar is now
  obsolete (runtime reads room from the active assignment), so the
  migration **does `$unset` it — but only for a record that already has a
  matching assignment** (`unsetLegacyRoom` iterates the assignment
  collections, never the source). A record whose legacy value could **not**
  be converted (room missing / cross-branch) keeps its `room_id`
  untouched. So no room information is ever lost: it is either carried into
  an assignment or left in place for review.
- **Reversible**: because the convertible scalars are unset, rollback is
  **restore the pre-migration `mongodump`** (take one first — see the
  runbook). Dropping the two assignment collections alone is *not* enough
  once `room_id` has been unset.
- **Report**: prints per-collection counts — migrated, already-present
  (idempotent skip), invalid-room, cross-branch, ended-history,
  legacy-room_id-unset — and exits non-zero on any unexpected error.

### Implementation note — read the RAW `room_id` (do not regress)

`Child.RoomID` / `Staff.RoomID` are now **`bson:"-"` computed projections**
(resolved from the active assignment at read time), so decoding a source
document into `models.Child` / `models.Staff` yields an **empty** room_id
and the migration would convert **nothing** — silently leaving prod with
every child/staff unassigned. The convert path therefore decodes into a
dedicated `legacyRoomSource` struct carrying the real `bson:"room_id"`
tag; `verifyNoConvertibleLeftover` reads it from raw `bson.M`. Keep both
reading the raw scalar — never route the legacy read back through the
model structs.

## Verification (run after migrating)

`make migrate-room-assignments` is followed by a verify pass (same
binary, `-verify` flag) that recounts: every child with a legacy
`room_id` and an existing valid room must have exactly one
active/ended assignment matching that room, and every active assignment's
room must match the child's derived `room_id`. Mismatches are listed and
the command exits non-zero.

## Deprecation path for the legacy fields — DONE

The consolidation completed the deprecation in one step (no interim
dual-write): the stored `room_id` scalar is **removed** (the model field
is `bson:"-"`), `PUT /admin/staff|children/{id}` **no longer accept**
`room_id` (dropped from the request DTO; `DisallowUnknownFields` rejects
it), and the migration `$unset`s the obsolete scalar as it converts.
`room_id`/`room_name` remain on API **responses** only, as a computed
projection. See `room-allocation-design.md` and
`../architecture/duplicate-implementation-audit.md`.

## Production release runbook (develop → main)

The new code reads room from the assignment collections, which are
**empty on a box that has never run this migration** — so the migration
is a **required** release step, not optional. Without it every child (and
any staff with a legacy `room_id`) reads as unassigned across the rota,
child/staff detail, capacity and attendance registers.

1. **Back up first**: `mongodump` the prod DB. The migration `$unset`s the
   legacy `room_id`, so the dump is the rollback path.
2. **Deploy the new code** (build on the box, `docker compose ... up -d
   --build --force-recreate`). App startup creates the two assignment
   collections + their partial-unique indexes.
3. **Run `make migrate-room-assignments`** on the box — it converts, then
   runs `-verify` in the same target.
4. **Confirm the tail reads `VERIFY OK`** and the report shows
   `migrated=<N>` for children (staff is typically 0 — prod staff have no
   stored `room_id`). Any `MISMATCH …` line or a non-zero exit means the
   convert did not complete — **stop and investigate; the release is not
   done.**
5. **Spot-check** a few children in the admin UI show their room, and the
   rota groups them under the right classroom.

There is a brief window between steps 2 and 4 where rooms read as
unassigned — keep it short by running the migration immediately after the
containers are healthy.

⚠️ **Never run `make seed-children` / `seed-famly` on prod** — they drop
`child_room_assignments` (and reseed children). This is covered by the
standing "no seeds on prod" rule; it matters more now that those
collections are the source of truth.
