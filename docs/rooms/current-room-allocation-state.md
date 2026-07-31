# Current room-allocation state (pre-implementation baseline)

Verified against the actual source and the live local database before any
change was made. Baseline test results at the bottom.

## Data model today

- **Room** (`models/room.go`, collection `rooms`): branch_slug, name,
  free-text `age_range`, `capacity` (int), `staff_ratio` (1:N). **No**
  status/archive concept, no room code, no structured min/max age months,
  no opening/closing dates. `Delete` is a hard `DeleteOne` with **no
  check for children/staff/shifts still referencing the room** — dangling
  `room_id`s are possible.
- **Child.RoomID** (`models/child.go`): a plain string, `omitempty`.
  Written only by `applyChild` via `PUT /admin/children/{id}` —
  **unconditional** (clear-on-omit). No existence/branch/capacity/age
  validation (the suite's `CHILDROOM-TC-003/004`/`ROOMSTAFF-TC-003b` gap
  locks document this). **No assignment history of any kind.**
- **Staff.RoomID** (`models/staff.go`): identical pattern via
  `applyStaff`. No history, no validation.
- **Shift.RoomID/RoomName** (`models/shift.go`): per-shift room for the
  rota — scheduling, a separate concern from allocation; not touched by
  this work.

## Who reads the room linkage today

| Consumer | Reads | Notes |
|---|---|---|
| `childService.CapacityForecast` | `Child.RoomID` + `Sessions` | the only room-level consumer of child room; groups active children by room, projects AM/PM headcount |
| `childService.Stats` | room **capacity only** (branch-level) | occupancy is branch-level; `Child.RoomID` is ignored |
| Staff-attendance register | `Staff.RoomID` | resolves display name via a rooms id→name map |
| Child-attendance records | `Child.RoomID` | snapshotted onto the attendance record |
| Rota UI (`RotaClient`) | `Staff.RoomID` | classroom grouping; roomless staff behind "Show all staff" |
| Staff detail UI | `Staff.RoomID` | name resolved **from this week's shifts** with an "Assigned room" fallback |
| Child detail/list UI | `Child.RoomID` | name resolved from `adminGetRooms`; edit form has a branch-filtered room `<select>` |
| Branch dashboard | room count + summed capacity | via `branch_overview.go` |

## Existing endpoints

- `GET/POST /admin/rooms`, `GET/PUT/DELETE /admin/rooms/{id}` — all under
  `RequirePermission(PermChildrenManage)`, branch-scoped via
  `policy.EffectiveBranch`/`inScope`, audit-logged.
- Child room changes: only via full `PUT /admin/children/{id}`.
- Staff room changes: only via full `PUT /admin/staff/{id}` — **and no UI
  renders that field** (see `staff-room-field-investigation.md`).

## Duplicate / incomplete implementations found

- No duplicate allocation logic exists — there is simply **no allocation
  logic at all** beyond the raw string field. Nothing to consolidate,
  but three read models (child.room_id, staff.room_id, shift.room_id)
  must stay coherent with whatever becomes authoritative.
- The staff room display resolving via shifts (not rooms) is an
  incomplete implementation — replaced by this work.

## Live data (local dev DB at time of investigation)

- 23 rooms across 5 branches (harrow 7, pinner/northwood/pinner-green/
  borehamwood 4 each).
- **513 of 519 children have `room_id` set** (Famly import) — the values
  the migration must preserve.
- **0 of 102 staff have any room field** — staff migration is a no-op on
  this data set but is still implemented for other environments.

## Baseline test results (before any change)

- `go test ./...` (backend): **all green**.
- `mvn test` (bnrest engine unit tests): **all green**.
- Live suites against the local stack: `SUI-ROOM-001` **7/7**,
  `SUI-ASSIGN-001` **12/12**.
- No pre-existing failures to carry forward.
