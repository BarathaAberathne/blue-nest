# Room-allocation design

> **Consolidated architecture (updated).** There is exactly **one** source of
> truth for room allocation: the effective-dated assignment collections
> (`staff_room_assignments`, `child_room_assignments`). The old
> `staff.room_id`/`child.room_id` **stored scalars have been removed** — there
> is no dual-write, no sync job, and no compatibility shim. `room_id`/
> `room_name` remain on the API responses only as a **computed projection**
> (`bson:"-"`, resolved live from the active assignment at read time, exactly
> like `Child.KeyPersonName`), so every read consumer (rota grouping,
> attendance/kiosk registers, capacity-forecast, child/staff list + detail UI)
> keeps working while writing goes solely through the assignment endpoints.
> See `docs/architecture/duplicate-implementation-audit.md` for the rationale
> and the removed structures.

One authoritative, effective-dated assignment model per relationship.

## Models (new collections)

**`staff_room_assignments`** — `models.StaffRoomAssignment`:
`id, org_id, branch_slug, room_id, staff_id, role_in_room, is_primary,
start_date (YYYY-MM-DD), end_date (omitempty), status (active|ended),
created_by, updated_by, created_at, updated_at` + transient resolved
`room_name`/`staff_name`. Rules:

- Multiple **active** assignments per staff member are allowed (multi-room
  working), but the same `(staff_id, room_id)` pair may have only one
  active assignment — enforced by a **partial unique index**
  `{staff_id, room_id} where status="active"` so even racing requests
  cannot duplicate it.
- At most one `is_primary` active assignment per staff member — enforced
  in the service (assigning a new primary clears the flag on others). The
  primary room is what syncs to the derived `staff.room_id`.
- Staff and room must belong to the same branch; inactive staff and
  inactive rooms are rejected; ending sets `end_date`+`status=ended`,
  never deletes.

**`child_room_assignments`** — `models.ChildRoomAssignment`:
`id, org_id, branch_slug, child_id, room_id, start_date, end_date,
status (active|scheduled|ended), transfer_reason, notes, override_reason,
created_by, updated_by, created_at, updated_at` + transient `room_name`/
`child_name`. Rules:

- **Exactly one `active`** assignment per child — partial unique index
  `{child_id} where status="active"`; plus at most one `scheduled`
  (future-dated) assignment — partial unique index
  `{child_id} where status="scheduled"`. The indexes are the concurrency
  backstop (CHILDROOM-TC-018): two racing transfers cannot both create an
  active row.
- Same-branch validation, active-room/active-child validation, room
  **capacity check** (active current assignments vs `room.capacity`) and
  **age-range check** (child DOB vs room min/max age months, when the
  room has them configured). Both are overridable by an authorised caller
  **only with a non-empty `override_reason`**, which is stored on the
  assignment and audit-logged (`capacity_override`/`age_override`).
- History is never deleted; transfers close the old row and create a new
  one.

## Transfer semantics

`POST /admin/children/{id}/transfer-room {room_id, effective_date,
reason, override_reason?}`:

1. Validate everything up front (destination exists, active, same branch,
   not the same room, capacity/age or override, valid date).
2. **Effective today or past**: end the current active assignment
   (`end_date = effective_date`), create the new active assignment. If
   the create fails, the previous assignment is **restored
   (compensating rollback)** so the child is never left roomless; the
   partial unique index prevents the double-active case from the other
   direction. Then sync `child.room_id` and audit.
3. **Future-dated**: the current assignment stays active with its
   `end_date` set to the effective date, and the new row is created as
   `scheduled`. Scheduled assignments are **lazily activated**: any
   read/write through the assignment service first promotes due
   scheduled rows (start_date ≤ today) to active and ends the
   overlapping active row — no cron needed.

**Transactionality note**: local/prod Mongo runs single-node (no replica
set), so multi-document ACID transactions are unavailable. The
compensating-rollback + partial-unique-index design above is the
strongest guarantee available in this deployment; if the compensation
itself fails (double fault) the error is logged loudly and surfaced to
the caller. Documented, not hidden.

## Room model extensions (additive, backward compatible)

`Room` gains: `code` (optional short code, **unique per branch** when
set), `description`, `min_age_months`/`max_age_months` (0/0 = not
configured → age checks skipped; the legacy free-text `age_range` remains
for display), `status` ("" or "active" = active; "inactive" = closed to
new allocations), `opening_date`/`closing_date`. `applyRoom` preserves
the new fields when a legacy payload omits them (same partial-update
convention as staff/children), and status changes go through a dedicated
`PATCH /admin/rooms/{id}/status` so an old edit payload can never
accidentally reactivate/deactivate a room. `DELETE /admin/rooms/{id}` now
refuses to delete a room that still has active/scheduled assignments.

## Single service, both directions

`StaffRoomAssignmentService` and `ChildRoomAssignmentService` are the only
writers. Room-profile endpoints and staff/child-profile endpoints call the
same service methods — no duplicated business logic per controller.
`PUT /admin/staff/{id}` / `PUT /admin/children/{id}` **do not accept
`room_id` at all** (the request DTOs dropped the field; `validator.DecodeJSON`
rejects it as unknown). Allocation is a first-class operation via the
assignment endpoints; the create screens issue a `POST …-room-assignments`
as a second canonical call when a room is chosen at creation. There is no
legacy write path and no dual-write.

## Routes (all following existing conventions)

Under `RequirePermission(PermChildrenManage)` (rooms + child allocations):

```
PATCH /admin/rooms/{id}/status                      activate/deactivate
GET   /admin/rooms/{id}/capacity                    capacity summary (one room)
GET   /admin/rooms/capacity?branch=                 capacity summaries (branch)
GET   /admin/rooms/{id}/children                    child assignments (?include=history)
POST  /admin/child-room-assignments                 allocate child (either UI side)
PATCH /admin/child-room-assignments/{id}            end an assignment
GET   /admin/children/{id}/room-assignments         child's history
POST  /admin/children/{id}/transfer-room            transactional transfer
```

Under `RequirePermission(PermStaffManage)` (staff allocations):

```
GET   /admin/rooms/{id}/staff                       staff assignments (?include=history)
POST  /admin/staff-room-assignments                 allocate staff (either UI side)
PATCH /admin/staff-room-assignments/{id}            end / set-primary / change role
GET   /admin/staff/{id}/room-assignments            staff member's history
```

Branch scoping identical to shifts/staff: handlers pass
`policy.AllowedOrNil(role, scope)` into the service, which rejects
out-of-scope branches; cross-branch record IDs return 404/403 without
leaking data. Rooms listing already pins scoped callers via
`policy.EffectiveBranch`.

## Capacity definitions (single backend source of truth)

`GET /admin/rooms/{id}/capacity` returns, per room:

- `capacity` — the room's configured placement capacity
- `allocated_children` — count of **current active** child assignments
- `future_children` — count of `scheduled` assignments
- `available_spaces` — `max(capacity - allocated_children, 0)` plus an
  `over_capacity` flag (allocated > capacity, possible via override)
- `present_children` — today's checked-in count from the attendance
  register, reported **separately**; never used for available spaces
- `staff_allocated` — count of current active staff assignments

Dashboards/pages consume this endpoint rather than re-deriving the
formula client-side.

## Audit

Every mutation records via the existing `AuditService.Record` with
`entity_type` `room` / `staff_room_assignment` / `child_room_assignment`
and actions: `create`, `update`, `status` (room);  `allocate_staff`,
`update_staff_allocation`, `end_staff_allocation`, `set_primary_room`;
`allocate_child`, `transfer_child`, `end_child_allocation`,
`capacity_override`, `age_override`. Details maps carry previous/new
values, reason, and the request's `X-Correlation-Id` when present.

## Permissions

No new roles. Staff allocations sit under `staff.manage`, child
allocations + rooms under `children.manage` — the same permissions that
already gate the respective profile pages, honouring the existing
role→permission map (director/admin org-wide; branch-scoped roles pinned
by `policy`).
