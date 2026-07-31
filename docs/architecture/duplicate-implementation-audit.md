# Duplicate-implementation audit — room allocation

Correcting the "legacy + new + adapter + dual-write" pattern introduced in
the first room-allocation pass. **Only the Enquiry module is genuinely used
in production**; rooms/staff/children/allocations are active-development,
so they are refactored **in place** into one canonical implementation, not
kept as parallel old/new systems.

## Production-usage evidence

- Prod runs only the Enquiry flow with real operational data (per the
  product owner). `staff.room_id`/`child.room_id` are **not** a production
  contract: they were never surfaced in any working UI (the staff field was
  the reported bug — never editable), and the child values present locally
  come from the local Famly dev seed, not production. No external
  integration or deployed client depends on them.
- Therefore none of the structures below qualify as "legacy" under the
  project's definition. They are consolidated immediately.

## Duplications introduced, and the canonical decision

| Capability | Duplicate I introduced | Canonical choice | Action |
|---|---|---|---|
| Staff→room link | stored `staff.room_id` scalar **+** `StaffRoomAssignment` (kept in sync) | `StaffRoomAssignment` | Remove the stored scalar; expose `room_id`/`room_name` as a **computed read projection** resolved from the active primary assignment. |
| Child→room link | stored `child.room_id` scalar **+** `ChildRoomAssignment` | `ChildRoomAssignment` | Same — stored scalar removed, computed projection for reads. |
| Legacy write path | `StaffRequest.RoomID`/`ChildRequest.RoomID` (`*string`) + `LegacySetRoom` shims delegating PUTs into the assignment service | assignment endpoints only | Remove the DTO fields and both `LegacySetRoom` methods; staff/child PUT no longer touch rooms at all. |
| Sync job | `syncStaffRoom`/`syncChildRoom` writing the scalar after every assignment change | none | Removed — no ongoing synchronisation between two models. |
| "Current room" reads | `capacity-forecast`, child-attendance snapshot, daily-record fallback, staff-attendance register, kiosk all read the stored scalar | active assignment | Each now resolves the current room from the canonical assignment repo (batched where it's a list). |

## What is a stored field vs. a computed projection (the rule applied)

- **Stored, canonical:** `staff_room_assignments`, `child_room_assignments`.
- **Computed, transient (`bson:"-"`, resolved at read time, never written):**
  `Staff.RoomID`/`RoomName`, `Child.RoomID`/`RoomName`. This is the same
  pattern already used for `Child.KeyPersonName`. It is **not** a dual
  source of truth — nothing writes it, nothing stores it; it is projected
  live from the assignment model for display so existing UI keeps working.
- **Legitimate event snapshots (unchanged, not a dual-write):** the
  `room_id` recorded ON an attendance record or daily-record captures which
  room the child was in at that moment. Its *source* moves to the active
  assignment, but the recorded value stays on the event record.

## Migration status

`cmd/migrateroomassignments` is **local-only, never applied to
production**. It is therefore consolidated to a clean end state: build the
canonical assignment rows from any pre-existing stored `room_id`, then
`$unset` the stored scalar so no obsolete field remains in the data. Its
verification moves to a migration test under `tests/migrations/`. No
production migration history is edited.

## Compatibility layers retained

**None.** There is no confirmed production dependency, so no adapter, no
versioned route, no dual-write, and no feature flag is kept. The staff/
child PUT endpoints keep their paths and every other field; they simply no
longer accept or write `room_id` (allocation is a first-class operation via
the assignment endpoints).
