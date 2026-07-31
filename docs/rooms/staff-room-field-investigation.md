# Staff room field — root-cause investigation

**Reported symptom**: a room is visible on the staff profile, but no room
field appears when the staff profile's Edit button is clicked.

## Root cause

The room field is **read-only by omission, not by design or condition**.
It is never rendered in ANY staff edit or create form — there is no
role/permission/branch condition hiding it; the inputs simply don't exist.

The full trace:

1. **Where the room IS shown** (`frontend/app/admin/staff/[id]/StaffDetailClient.tsx`):
   - Header strip (`{roomName && <span…><DoorOpen/> {roomName}</span>}`).
   - "Basic info" read view (`<ReadField icon={DoorOpen} label="Room" …/>`).
   - The displayed name is resolved **from this week's rota shifts**, not
     from `/admin/rooms`:
     `member.room_id ? shifts.find(s => s.room_id === member.room_id)?.room_name ?? "Assigned room" : null`
     — so a staff member with a `room_id` but no shift that week shows the
     literal placeholder "Assigned room".

2. **Where the room is NOT shown** — all three scoped edit forms on the
   detail page:
   - **Identity Edit** (the header **Edit** button → `IdentityEditForm`):
     renders Branch, Status, DBS number/expiry, First-aid expiry,
     login role/password. No room input.
   - **Basic info Edit**: first/last name, job title, email, phone, and an
     empty `<div/>` grid slot. No room input.
   - **Contract Edit**: staff type, start date, contract hours. No room input.
   - **Creation form** (`StaffClient.tsx`): `emptyForm` initialises
     `room_id: ""` but no input renders it — a room can never be set at
     creation either.

3. **Why the stored value survives editing anyway**: every save PUTs
   `{ ...memberToInput(member), ...patch }`, and `memberToInput` includes
   `room_id: m.room_id ?? ""` — the current value is echoed back on every
   submit. This is the only thing protecting the data, because…

4. **The backend clears room_id when omitted**:
   `backend/internal/service/staff.go` `applyStaff` preserves most fields
   when the request value is empty (the historic partial-update data-loss
   fix), but `RoomID` is deliberately excluded from the preserved set:
   `st.RoomID = strings.TrimSpace(req.RoomID)` — unconditional, commented
   as "clearing it is the legitimate 'unassign from room' action". Any
   client that builds its own payload without `room_id` silently unassigns
   the room.

5. **No other write path existed**: a backend-wide grep shows the only
   writer of `Staff.RoomID` was `applyStaff`; no seed tool sets it. This
   matches the live data: **0 of 102 staff documents have any room field
   at all** — the field has never actually been used in production data,
   it has only ever been round-tripped.

## Why this field is NOT simply being added to the edit form

Per the room-allocation design (`room-allocation-design.md`): staff can
work in more than one room, so a single editable `staff.room_id` would be
a misleading competing source of truth. The fix instead:

- Introduces `StaffRoomAssignment` (effective-dated, multi-room, primary
  flag) as the single authoritative model.
- Replaces the read-only room display on the staff profile with a full
  **Room Allocations** section (current, primary, historical) that is
  visible in both view and edit workflows and managed via its own
  endpoints — the hidden-field bug cannot recur because the section no
  longer depends on any form rendering a legacy input.
- **Removes the stored `staff.room_id` scalar entirely.** `room_id`/
  `room_name` remain on the API response as a **computed projection**
  (`bson:"-"`, resolved live from the staff member's primary active
  assignment at read time), so the rota grouping and the staff-attendance/
  kiosk registers keep working — but nothing writes or stores a scalar, so
  there is no dual source of truth to drift.
- `PUT /admin/staff/{id}` (and `PUT /admin/children/{id}`) **no longer
  accept `room_id` at all** — the field is gone from the request DTO, so a
  profile save can never touch the room. The clear-on-omit footgun is
  eliminated by construction. Allocation is done only through the
  assignment endpoints (and, on the create screens, a second canonical
  `POST …-room-assignments` call when a room is picked at creation).

See `docs/architecture/duplicate-implementation-audit.md` for the full
consolidation (this replaced an earlier interim approach that had kept a
synced scalar + a legacy delegating write path).
