# Current SEND behaviour — investigation report

Investigated 2026-08-15 on `feature/send-support` (stacked on `feature/profile-pictures` →
`feature/family-onboarding` → develop). Searched: `backend/internal/**` (models, repos, services,
handlers, routes), `frontend/**` (admin pages, portal, lib, types), `test-platform/tests/**`,
`test-automation/**`, seeds and docs, for `send|sen|senco|ehcp|special need|additional need|
disability|support plan|safeguarding|medical|allergy|key person`.

## Headline answer

**Does the CMS currently distinguish SEND children? Effectively no.**

There is no SEND field on the Child model, no SEND room concept, no SEND UI, no SEND permission,
no SEND KPIs and no SEND tests. What exists is:

- **Unstructured free-text** in the child induction form's required **"Development & SEN"** section
  (`models.InductionSections` key `development`; field catalogue in `frontend/lib/induction.ts`):
  `difficulties`, `sen` ("Special needs or disabilities"), `sen_status` ("Early Years Action /
  Action Plus / SEN Statement in place?"), `support_needed`, `two_year_check_done` — plus
  `equality.sen_category` ("SEN status category (monitoring only)"). This data lives ONLY inside
  the `ChildInduction.Sections["development"].Data` map. It is **not written through** to the
  canonical Child (unlike allergies/dietary/medical/address, which are), is not queryable, is not
  surfaced anywhere except the induction section renderer, and drives nothing operationally.
- **A `senco` system role already exists** (`models.RoleSENCO`, label "SENCO" in `role.go`,
  part of the B3 enterprise role catalogue, seeded per org): granted `dashboard.view`,
  `children.manage`, `daily_logs.manage`. It is assignable on `/admin/users` today. There is no
  SEND-specific permission, so a SENCO currently sees exactly what any children.manage holder sees.

**Closest existing functionality:** the induction free-text above, the canonical child
medical/allergy fields, and the SENCO role. Nothing connects them.

## 1. Current child model (`models/child.go`)

Canonical single Child record (collection `children`, tenant-scoped). Relevant fields:
`allergies`/`dietary_reqs`/`medical_notes` (free text) + `allergy_tags[]`/`dietary_tags[]`
(taxonomy-driven chips, canonical home, induction writes through), `key_person_id` (+ projected
name), `photo_url` (set only via `PATCH /photo`), `address`, `guardians` (legacy projection over
canonical `child_parent_relationships`), status lifecycle `active|waitlist|left`. Child create/
update guards: `applyChild` only overwrites supplied values; `DisallowUnknownFields` on DTOs.
**No SEND/SEN/EHCP/support fields anywhere on the model, DTOs or validators.**

## 2. Existing SEND / additional-needs fields

| Location | Field | Structured? | Used operationally? |
|---|---|---|---|
| Induction `development` section | `difficulties`, `sen`, `sen_status`, `support_needed`, `two_year_check_done` | No (free text/yesno in a `map[string]any`) | No — render-only |
| Induction `equality` section | `sen_category` | No | No |
| Child | `medical_notes`, `allergies`, `allergy_tags` etc. | Yes | Yes (profile, portal, write-through) — but medical, not SEND |

No enquiry/registration SEND fields (`models/enquiry.go` has none; production enquiry flow
untouched by this work).

## 3. Current room model (`models/room.go`)

`Room`: branch_slug, name, code, description, age_range (label) + min/max_age_months
(structured), capacity, staff_ratio (1:N), status (`active|…`), opening/closing dates.
**No room type / provision / specialist concept exists.** Rooms are created manually, via branch
templates, or the age-group quick-fill.

## 4. Current child-room relationship (source of truth)

The **effective-dated assignment collections** are the single canonical source:
`child_room_assignments` (`models/room_assignment.go`, repo/service under
`RequirePermission(children.manage)`). The old stored `child.room_id` scalar was **removed**;
`room_id`/`room_name` on API responses are computed projections resolved live from the active
assignment. Allocation (`childRoomAssignmentService`) enforces same-branch + active room +
capacity + age — each overridable only with a stored `override_reason` (audit-logged; recorded in
the assignment's `overrides[]` e.g. `capacity_override`). Transfers close the old row and open a
new one (future-dated → `scheduled`, lazily activated); full history retained.
`RoomCapacitySummary` derives allocated/available from active assignments. The Room Planner and
capacity forecast resolve placements per date. **This is exactly the mechanism SEND allocation
must reuse unchanged.**

## 5. Existing SEND-related UI

None. Child profile shows medical/allergy sections; induction render shows the Development & SEN
answers to induction viewers; the room detail page shows roster/capacity/staff/history tabs;
children list filters by branch/room/status/search. No SEND badge, filter, view or report exists.

## 6. Existing permissions and roles

Granular `Permission` system (`models/permission.go`): role→[]Permission map, org-scoped
overrides via the Permission Builder, `middleware.RequirePermission`, frontend `usePermissions`.
Roles relevant to SEND access today:

| Role | children.manage | Notes |
|---|---|---|
| super_admin / admin | ✅ (AllPermissions) | |
| director | ✅ | broad read/manage |
| regional_manager / branch_manager / deputy_manager | ✅ | branch-scoped via `policy` |
| **senco** | ✅ | exists, but no SEND-specific capability |
| eyfs_lead | ✅ | |
| room_leader / practitioner | ✅ | see all child data incl. medical today |
| office_admin | ✅ | |
| parent (customer) | portal only, own children | |

**No SEND permission exists.** Adding one to `AllPermissions` + built-in role maps auto-reconciles
onto existing DB roles at boot (`roleService.ensureSeededForOrg` union mechanism — established).

## 7. Existing tests

None for SEND (all grep hits were "sending"/"sends" false positives). Relevant reusable
infrastructure: `CHILD-UTIL-003` (create child), `BRANCH-FIX-001/002`, room + child-room
allocation suites `SUI-ROOM-001`, `SUI-CHILDROOM-001` (allocate/transfer/override/capacity),
`SUI-CAPACITY-001`, role-scoping cases (`ROLE-TC-001` branch-scoped manager pattern),
`AUDIT` suite. Legacy REST-Assured suite: no SEND coverage.

## 8. Existing production dependencies

Production (main) runs the pre-family-onboarding child model. Nothing in production reads or
writes SEND data. The enquiry pipeline (production-critical) carries no SEND fields — leaving it
untouched carries zero migration risk.

## 9. Duplicate or incomplete SEND implementations

None found. There is no half-built SEND module, no legacy fields, no dead code paths. The only
"incomplete" artefact is the induction free text never being connected to anything — by design it
is parent-supplied narrative, and this investigation recommends it STAYS narrative (a manager
records operational SEND status deliberately after reviewing it; no auto write-through).

## 10. Data that could already represent SEND children

Only the induction `development`/`equality` free text (present for children whose induction has
been completed since Phase 4 of family-onboarding — a handful locally, none in production). It is
not reliable enough to migrate from automatically; no data migration is required or attempted.
Absent SEND data on existing children correctly means "no additional support information
recorded".
