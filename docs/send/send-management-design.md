# SEND / Additional Support — design

Status: implemented on `feature/send-support`. Follows the investigation in
`current-send-behaviour.md`. Design principle (as required): **SEND status describes the child;
room classification describes the room; the canonical `ChildRoomAssignment` connects them — the
three are independent.** No `SendChild`, no `SendRoomAssignment`, no SEND-specific transfer path.

## Conceptual model

```
Child (canonical, unchanged identity)
├── send_status                       ← operational marker, stored ON the child, set ONLY by the SEND service
├── child_send_support (0..1 doc)     ← sensitive profile, separate collection, own permission
└── Current Room Assignment           ← normal child_room_assignments (untouched)
        └── Room.provision            ← "" mainstream (default) | "send_dedicated"
```

Supported combinations (all through the normal allocation service): SEND child + SEND-dedicated
room · SEND child + mainstream room · non-SEND child + mainstream room · non-SEND child +
SEND-dedicated room (allowed with a UI notice — no hard rule exists in the business today).

## Why a two-tier child model (operational status + separate sensitive profile)

- **`Child.SendStatus`** (bson `send_status,omitempty`) is the non-sensitive, filterable,
  badge-driving marker — the same tier as allergy *tags*: practitioners caring for a child need to
  know "this child has additional support" (roster badge, list filter) without seeing the record.
  It is set **only** by the SEND service as a projection of the profile (single writer — the
  photo/key-person pattern), never via child `PUT` (`DisallowUnknownFields` keeps it out of DTOs).
  Absent (`""`) = not identified — existing children behave exactly as before; no migration.
- **`child_send_support`** (tenant-scoped collection, unique per child, **absent doc = nothing
  recorded**) holds the sensitive detail and is reachable ONLY through its own endpoints behind a
  new permission — sensitive data can never leak through child lists, kiosk, portal, exports or
  search because it is never embedded in child payloads.

## SEND status enum (aligned to the real UK EYFS workflow, incl. the induction form's own language)

```
""            not identified (absent — the default for every existing child)
monitoring    under observation / early concerns
sen_support   SEN support in place (the form's "Early Years Action / Action Plus")
ehcp          EHCP in place (the form's "SEN Statement"; EHCP is a status level, not a bool)
ended         support ended — history retained, treated as non-SEND by filters
```

`models.SendStatusActive(s)` (= monitoring|sen_support|ehcp) is the single classifier every
filter/KPI uses (mirrors the `IsWorking`/`IsAway` convention). Status changes over time via
profile updates; history is preserved by the append-only audit log (prev→new recorded), not a
versioned collection — consistent with how every other status change in the CMS is historised.

## Profile fields (minimal, justified)

```
ChildSendSupport: id, org_id, child_id (unique/org),
  status            SendStatus (source of truth; projected onto Child.SendStatus)
  summary           free text — "support required in our setting" (induction language)
  categories []string — org-configurable taxonomy list (NEW category "send_category",
                     seeded with the four statutory EYFS broad areas) — never hardcoded
  send_lead_staff_id — the SENCO/SEND-lead RESPONSIBILITY: a staff reference (projected name),
                     deliberately NOT a security role requirement; any staff member can hold it
  plan_status       "" | draft | active | ended   (drives the "active support plan" KPI)
  review_date, start_date, end_date (YYYY-MM-DD)
  created_at/updated_at
```

Deliberately excluded: diagnoses/medical detail (belongs in existing medical fields or offline
records), parent-visible notes (no portal exposure in v1), EHCP sub-workflow states, 1:1-staffing
assignments (no evidence of need yet; would be its own design, NOT a misuse of room assignments).
No write-through from the induction "Development & SEN" free text — that is parent narrative; a
manager records operational status deliberately after reviewing it.

## Room classification

`Room.Provision`: `"" = mainstream` (default, all existing rooms unchanged) |
`"send_dedicated"`. `MIXED_PROVISION` is intentionally omitted: a mainstream room containing SEND
children *is* mixed provision de facto, and the branch SEND view reports exactly that — a third
label adds no operational decision value. Editable on the room form (`branches.manage`-level
room management, audited). Room capacity/age/ratio semantics unchanged — **SEND children count
toward normal capacity; there is no second capacity calculation.**

## Allocation behaviour

Zero new enforcement. The existing capacity/age soft-block + `override_reason` machinery is
untouched. SEND adds **UI notices only** (the required "warnings where operational judgement is
required"): the assign/transfer modal shows "This room is SEND-dedicated provision" and/or "This
child is recorded as requiring additional support" so management applies nursery policy. No
`child.sendRoomId`, no SEND transfer service — transfers preserve the SEND profile trivially
because the profile never references rooms.

## Permissions

New `PermSendManage` (`send.manage`) gates the sensitive profile (read+write) and the branch SEND
view. Granted to: AllPermissions (super_admin/admin), director, regional_manager, branch_manager,
deputy_manager, **senco**, eyfs_lead. NOT granted to room_leader/practitioner/office_admin — they
see only the operational badge/filter via `children.manage`. Parents see nothing SEND in v1.
Branch scoping: every SEND handler resolves the child and applies the same `inScope`/policy
guards as the child endpoints; the SEND overview pins branch-scoped callers via
`policy.EffectiveBranch`. Boot-time role reconciliation propagates the new permission to existing
built-in DB roles automatically.

## API (follows existing conventions — child-nested resources + one overview)

```
GET    /admin/children/{id}/send-support      → profile ({} data:null when none)   send.manage
PUT    /admin/children/{id}/send-support      → upsert; syncs Child.SendStatus; audited
GET    /admin/send/overview?branch=           → KPIs + per-child rows              send.manage
```

Room provision rides on the existing `POST/PUT /admin/rooms` (one new DTO field). Allocation and
transfer stay on the existing child-room endpoints, unmodified. Child list filtering needs no new
endpoint — `send_status` is on the child payload.

## UI

- **Child profile**: separate "Additional Support / SEND" card — visible only with `send.manage`;
  edit form for status/summary/categories/lead/plan/review; restrained "Additional support" badge
  next to the status chip for children.manage viewers (badge only, no detail).
- **Children list**: filter All / SEND / Non-SEND + small badge on SEND rows.
- **Rooms**: provision select on create/edit; "SEND-dedicated" badge on the rooms list and room
  detail; room detail capacity strip gains a SEND-children count (operational count only).
- **Branch SEND view** `/admin/send` (nav gated on send.manage): KPI tiles (SEND children,
  dedicated rooms, in specialist / in mainstream / unallocated, active plans) + table (child,
  age, room, provision, SEND lead, key person, status) with branch picker (policy-scoped).
- Kiosk/portal/public: untouched.

## Audit

`send_support_update` (child; prev→new status in details), room provision changes surface in the
existing room-update audit summary. Allocation/transfer audits are the existing ones.

## KPIs

Computed live from canonical records on the overview endpoint (derived-not-stored):
total SEND (active statuses), by-status breakdown, dedicated-room count, in-specialist vs
in-mainstream vs unallocated (reconciles: specialist + mainstream + unallocated = total), active
support plans. No sensitive categories/diagnoses in any KPI payload. Unrelated KPIs untouched.

## Migration

None. Absent field/doc = current behaviour. No dual-write, no legacy structures, nothing to
backfill. Taxonomy seed adds `send_category` defaults idempotently (`$setOnInsert` upserts).

## Tests

bnrest (generic, branch-independent, reusing CHILD-UTIL-003/BRANCH-FIX-001/childroom flows):
- `SUI-SEND-001` (2.32) — profile CRUD/status lifecycle, non-SEND unaffected, permission denial
  (practitioner 403 / senco 200), cross-branch 403, audit row, child PUT cannot set send_status.
- `SUI-SENDROOM-001` (2.33) — SEND-dedicated room create, SEND child → mainstream allocation,
  SEND child → dedicated allocation, transfers both directions preserving profile + capacity,
  overview KPI reconciliation.
Unit: status/plan validation + classifier. Regression: full affected suites + `make
test-e2e-regression`.
