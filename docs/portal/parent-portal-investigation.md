# Parent Portal — investigation & root cause

Investigated 2026-08-15 (test account `barathaaberathne@gmail.com`, linked to child Aria
Abeyrathne). Traced: parent login → user → parent identity → children → permissions → UI.

## Root cause: why the account sees only "Profile" and "Orders"

**The parent login page (`/login`) routes every customer-role user to `/account` — the STORE
customer area — and the Parent Portal (`/portal`) is never offered.** `LoginClient.landingFor()`
routes staff → `/admin/my-requests`, director → command centre, management → `/admin/dashboard`,
and everyone else to the `next` param, which defaults to **`/account`**. `/account` is the online-
shop account page (customer profile + store orders) that predates the portal. The `/portal` route
only sets `next=/portal` from its OWN auth guard — so the portal is reachable only by typing the
URL or via the activation flow's landing.

Everything below the routing works: the account resolves to user `customer`, `Parent.UserID`
links it to the canonical Parent record, `child_parent_relationships` grants Aria via
`portal_access`, `parentService.AuthorisedChildIDs` returns her, and `/portal` renders children,
completeness and finance when visited directly (verified). **The relationship model, permissions
and data flow are all correct — the portal simply isn't wired into the login journey, and the
store account page masquerades as "the parent area".**

Secondary finding: `/account` and `/portal` are two disconnected parent-facing surfaces (store vs
children) with no cross-links — the exact split this work consolidates.

## Current parent authentication flow

`POST /auth/login` (shared parents/staff) → JWT with org claim → role `customer`. Admin login
(`/admin/auth/login`) correctly rejects customers ("this account doesn't have staff or admin
access") — the security boundary is sound and stays.

## Canonical parent/child data model (single source of truth — already exists)

`users` (role customer) ← `Parent.UserID` → `parents` ← `child_parent_relationships`
(flags incl. `portal_access`) → `children`. One parent ↔ many children and many parents ↔ one
child both supported; branch-independent; `AuthorisedChildIDs` (lazy temporary-window downgrade,
portal_access-filtered) is the single access primitive every `/portal/*` route already goes
through. Guardians embedded on Child are a legacy display projection only. **No duplicate
relationship system exists; nothing to consolidate at the model layer.**

## Existing parent-facing functionality inventory

| Area | Exists? | Where |
|---|---|---|
| Portal dashboard | ✅ children cards + completeness + finance section | `/portal` (single page, own header, no nav) |
| Induction wizard + consents | ✅ | `/portal/children/{id}/induction` |
| Finance (balance, next payment, DD setup, history) | ✅ | portal dashboard section |
| Store orders | ✅ | `/account/orders` via `GET /orders/me` (canonical orders) |
| Customer profile | ✅ | `/account` (user-level, store-oriented) |
| Child overview for parents | ❌ (admin child profile only) | — |
| Attendance for parents | ❌ (canonical records exist; `FindByChild` ready) | — |
| Daily logs for parents | ❌ — and **no visibility model exists**: `IsApproved()` was the only
gate, meaning every approved log would be parent-visible by default if exposed. No sharing state,
no "send to parent". | — |
| Parent notifications | ✅ mechanism (users get in-app+email notifications; staff routes already
moved to the authenticated group) — reusable as-is | notifications module |

## Daily-log visibility decision (task §12)

`DailyRecord` is **one independent entry per record** (observation/meal/incident/… each their own
document with own approval workflow) — so visibility belongs at **record level**, not a day-
aggregate level. Chosen model: explicit `parent_shared` state on the canonical record —
`internal (default) → shared` — with the existing four-eyes approval as a precondition
(only approved records can be shared) and `safeguarding` records never shareable. Editing after
sharing: allowed (record stays shared; parents see the current state + "updated" timestamp) —
the simplest behaviour consistent with the CMS, where approval already gates content quality.
Withdrawal (unshare) is a permissioned action preserving the record + audit trail.

## Duplicates found

None at the model/service layer. UI-level duplication: `/account` vs `/portal` as parallel parent
surfaces — resolved by making `/portal` the canonical parent area (routing + nav + orders/profile
integrated) while `/account` remains the store-customer area for shoppers who are NOT parents
(cross-linked, same underlying endpoints, no duplicated logic).

## Recommended architecture (implemented)

- Login resolves parent identity (existing `GET /portal/me`): customer WITH a parent record →
  `/portal`; plain store customer → `/account`.
- One portal shell (header + compact left nav + child switcher): Dashboard · My Children
  (Overview / Attendance / Daily updates per child) · Payments & Orders · My Profile.
- New parent reads delegate to canonical services with parent-safe projections:
  `GET /portal/children/{id}/attendance` (attendance repo, staff-only fields stripped) and
  `GET /portal/children/{id}/daily-records` (daily-record service, `approved && parent_shared`
  only, staff-only fields stripped).
- One canonical sharing mutation: `POST /admin/daily-records/{id}/share|unshare`
  (`daily_logs.approve`), audited, notifying the child's portal parents via the existing
  notification service (type `daily_update_shared`, in the email-prefs catalogue).
