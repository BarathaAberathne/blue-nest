# Child Induction, Parent Portal & Finance — Discovery Report + Architecture Plan

Status: **DELIVERED** (P1–P8 complete on `feature/family-onboarding`, 2026-08-13). Decisions 2026-08-11:
Stripe Bacs DD · calculator-prefilled fees with manager confirm · /portal in the main app · first payment =
deposit + first month.

Delivery record: P3 parents/relationships + portal (commits 7681b1e…6273a92), P4 induction/consents/
onboarding (2531ba2, ce8ab32), P5 finance (b9d27fc), P6–P7 notifications + reminder scheduler (60e4a41).
Verification: unit tests (onboarding math, allocation/gate/webhook/sweep), bnrest suites SUI-PARENT-001 (4),
SUI-INDUCT-001 (3), SUI-FINANCE-001 (4) all green and registered in COL-FUNC-001; legacy REST-Assured
regression subset green; browser-verified E2E on localhost (invite → activate → portal wizard → first payment
→ allocation → mandate → onboarding finance gate → portal fees view → reminder sweep). Known follow-ups:
bulk reminders UI and org-configurable reminder offsets are future polish.

**⚠ OPEN PRODUCTION GAP — Bacs Direct Debit not yet enabled on the live Stripe account
(as of 2026-08-13, when the module merged to develop via PRs #149/#158).** Until the user enables Bacs
on the Stripe dashboard: online DD setup (`SetupDirectDebit` → hosted Checkout) and off-session
collection (`CollectCharge`) will FAIL in production; the audited **offline paper-mandate path**
(`finance.adjust` → `MarkMandateActive`) + manual payments fully cover the onboarding finance gate
meanwhile. When Bacs is enabled: verify the prod webhook (already on
`https://api.bluenest.uk/api/v1/webhooks/stripe`) has the finance events subscribed
(`setup_intent.succeeded`, `payment_intent.succeeded/processing/payment_failed`, `charge.refunded`)
and run one live setup + collection round-trip. Remove this notice once verified.
Source of truth for induction fields: `Child Induction Form.pdf` (11 pages, analysed 2026-08-11).

---

## Part A — Discovery: what exists today (verified against the repo)

### Flows already in production shape
- **Enquiry → Registration → Child**: `enquiries` CRM (statuses, notes, activity log, four-eyes-ish audit),
  `Register` creates the Child via `EnsureFromEnquiry` (idempotent per enquiry, guardian seeded from the
  enquiry parent, canonical room assignment optionally created from the registration panel's room picker).
- **Room allocation**: canonical effective-dated `child_room_assignments` (assign/transfer/end, capacity+age
  checks, override reasons, scheduled placements). Sole writer of a child's room.
- **Child profile**: read-complete (tags, sessions grid, key person picker, archive flow with `leave_date`,
  PickerModal pattern). Sequential refs (`CHD-…`) via `counters`.
- **Auth/RBAC**: one `users` collection; roles incl. `customer` (parents). Granular `Permission` set +
  org-scoped role→permission cache + per-org custom roles (Permission Builder). `middleware.RequirePermission`
  server-side; `usePermissions` client-side. `policy.EffectiveBranch`/`AllowedOrNil` branch scoping.
  JWT org claim; refresh tokens. **No invitation/activation-token flow exists** (register = self-serve email+password).
- **Parent-related code**: `Guardian` is an **embedded array on Child** (`name/relation/email/phone/primary`).
  No standalone Parent entity, no child↔parent join, no parent portal (the `customer` role sees the **store**
  `/account` area only — orders). Public checkout links nothing to children beyond an optional snapshot ref.
- **Stripe**: `stripe-go v76`. One integration: **store checkout** (order-first: pending order → Checkout
  Session → signature-verified, idempotent webhook reconciles paid/failed, restocks, emails).
  **No** SetupIntent / Subscription / Invoice / Bacs mandate / Customer-reuse code. Provider IDs stored on orders.
- **Finance-adjacent**: `fee_configs` (per-branch rates + org meta) powers the public calculator; `funding_type`
  on Child; `finance` role exists (procurement analytics + audit view). **No ledger, invoices, balances,
  schedules, or family accounts.**
- **Notifications**: in-app rows + opt-in email delivery (`NotifyMany` → branded shell email), per-user
  muted-type prefs, catalogue-driven types. **No scheduler** (everything is event-triggered inline).
- **Email templates**: per-org editable `email_templates` keyed by catalogue (`enquiry_acknowledgement`),
  `{{placeholder}}` substitution, HTML-escaped, branded shell. Exactly the mechanism reminder templates need.
- **Audit**: `audit_logs` append-only, `AuditService.Record` from handlers. No before/after values today.
- **Config**: org `Settings`/feature flags; taxonomy lists; terms; fee configs — the established pattern for
  the new configurable policies.
- **Tests**: bnrest COL-FUNC-001 (24 suites, ~197 cases) + legacy REST-Assured regression (55). Baseline green.

### Duplicate/incomplete implementations found (to resolve, not work around)
1. **Guardians vs the new Parent entity** — the embedded `Child.guardians` array is the only parent store;
   it duplicates people across siblings and can't authenticate. It must become a *projection/legacy-read* of
   the new canonical model, then be removed from the write path (same playbook as `room_id` → assignments).
2. **Emergency contacts** — none exist for children (staff have them). The induction form needs them; they
   are relationship rows, not a new collection.
3. **`finance` role** — exists but only grants procurement/audit perms; extend with the new finance permissions
   rather than creating another role.
4. **`/account`** — the store customer area. The parent portal should NOT be bolted into it; portal is a new
   `/portal` area but reuses the same login (`customer` role) and layout primitives. `/account` remains the store.

---

## Part B — Induction form field mapping (from the PDF)

| Form section | Fields | Canonical home |
|---|---|---|
| Child's details | first name(s), surname, **full address**, gender, DOB, birth-cert copy | Child (address is NEW; birth cert → Document) |
| Family details | lives-with parents; Contact 1+2: name, relationship, profession, work/mobile/home phones, email, home+work address, **parental responsibility Y/N** | **Parent entity + ChildParentRelationship** (lives_with, parental_responsibility) |
| Emergency contacts 1+2 | same field set + parental responsibility | Relationship rows flagged `emergency_contact` (a person may be parent AND emergency contact; non-parent contacts are Parent-entity rows with `portal_access=false`) |
| Other person with legal contact (S8 order) | name/address/phones/relationship/**contact arrangements** | Relationship row `legal_contact` + safeguarding notes (manager-only visibility) |
| Professionals | GP (+NHS number), health visitor, social care worker (+ involvement reason / CPP flag), dentist, other (agency/role) | NEW `Child.professionals` sub-doc; social-care reason is safeguarding-sensitive (manager-only) |
| Authorised collectors | 2× name/relationship/address/phones/email (16+), **collection password** | Relationship rows `authorised_collection` OR standalone collector entries; collection password on Child (write-only display rules) |
| About your child | previous childcare; immunisation checklist (fixed schedule, Y/N per vaccine); health-record book seen; ongoing conditions; agencies; health-care-plan Y/N | Induction responses; immunisations = structured checklist; conditions merge into `medical_notes` (canonical) |
| Allergies / dietary | allergy + food-intolerance text; dietary requirements | **Canonical Child fields** (`allergy_tags`/`allergies`, `dietary_tags`/`dietary_reqs`) — the induction UI writes THE SAME fields, never a copy |
| Cultural background | ethnicity description, religion, festivals, home languages, first-English-env, bilingual plan | Induction sections (ethnicity ALSO feeds equality monitoring) |
| Routine / general | sleep pattern, feeding routine, food prefs, pacifier, special toy, enjoys, likes/fears/special words | Induction section (settling-in info for practitioners) |
| Development (3+) | 11 difficulty checkboxes, concerns, SEN/disabilities, EY Action/Action+/Statement, support needed, 2-yr progress check done | Induction section; SEN flags surface on the child profile |
| Permissions/consents | CCTV, emergency treatment, inhalers/EpiPen, teething gel, nappy cream, paracetamol, sun cream, short trips, photographs (internal), photo/video sharing (marketing Y/N), animals (+ allergy note), online learning journey, policies ack, A&E ack, notice-period/fees ack, weather ack, final declaration | **Consent records**: one row per consent type, with decision, signatory (parent), typed-name signature, timestamp. Catalogue-driven (org-configurable list) |
| Staff sign-off | key person + manager signature/date | Induction review step (manager approve = sign-off; key person already on Child) |
| Equality monitoring | ethnicity checklist (17+other), SEN category | Induction (optional; flagged as monitoring-only) |
| Privacy notice | contact-preference consents (post/email/phone/none) + signature | Consent records on the Parent (not the child) |

Notes: the form's "FAMLY online learning journey" consent becomes the **parent-portal/learning-journey consent
for THIS system** (we are replacing Famly); wording comes from the consent catalogue, not code.

---

## Part C — Domain design (Phase 2)

New/changed entities (standard slice each: model → repo (TenantCollection) → service → handler →
`RequirePermission` routes → wired in `server.go`; sequential refs where user-facing):

1. **Parent** (`parents`): name, emails/phones (work/mobile/home), home+work address, profession,
   `user_id` (nullable — link to a `customer` user when portal access granted), portal access state
   (`none | invited | temporary | active | restricted | suspended`), invite token hash + expiry, ref `PAR-…`.
2. **ChildParentRelationship** (`child_parent_relationships`): child_id, parent_id, relationship type
   (mother/father/guardian/…), flags: `parental_responsibility, primary_contact, emergency_contact,
   authorised_collection, billing_contact, receives_communications, lives_with_child, portal_access,
   finance_access`, `legal_contact` + contact-arrangement notes, priority order. Unique (child, parent).
   **Replaces `Child.guardians` as the write model** — `Child.Guardians` becomes a computed read projection
   (bson:"-") during a deprecation window, then the UI switches fully. One-shot migration lifts existing
   embedded guardians into Parent + relationship rows (dedupe by email across siblings).
3. **Family / BillingAccount** (`families`): name, parent members, children, billing parent id,
   Stripe customer id, DD mandate ref + status, balance (derived), ref `FAM-…`. Created at first
   parent-link; siblings join the same family (guardian-email match suggests, manager confirms).
4. **ChildInduction** (`child_inductions`): one per child; per-section response maps mirroring the PDF's
   sections (family, emergency, legal-contact, professionals, collectors, about/health, immunisations,
   cultural, routine, development, equality); per-section status; save/resume; submitted_by (parent or staff),
   manager review/sign-off (reuses the four-eyes idea: reviewer ≠ submitter). Canonical-field sections
   (allergies/dietary/medical, contacts) **write through to the canonical stores**, never fork copies.
5. **Consent** (`consents`): child_id (or parent_id for privacy prefs), consent key (org-configurable
   catalogue seeded from the PDF list), decision (granted/declined), signatory parent, typed signature name,
   note (e.g. animal allergies), timestamps. Immutable rows; changes append a new row (audit-natural).
6. **Charge/Invoice** (`charges`): family_id, child_id (attributable), description, amount, due date,
   status (`draft|upcoming|due|processing|paid|partially_paid|overdue|failed|cancelled|refunded|written_off`),
   ref `INV-…`. **Payment** (`payments`): family_id, amount, method, provider refs
   (payment_intent/charge/mandate), status, idempotency by provider event id. **PaymentAllocation** links
   payments→charges (supports partial). Balance = derived, never stored-authoritative.
7. **PaymentSchedule**: recurring rule per family/child (amount, day-of-month, start/end) generating
   upcoming charges; "first payment" is a flagged charge (`first_payment: true`).
8. **Onboarding engine** (no new collection): `GET /admin/children/{id}/onboarding` **derives** the checklist
   from real state (registration ✓, room ✓, parents linked, induction %, emergency contacts, consents,
   DD mandate, first payment) + weighted completeness. Weights + requirement toggles live in **org settings**
   (`OrgSettings.Onboarding`), mirroring the fee-config pattern. Child gains one persisted field only:
   `onboarding_status` (derived, recomputed on writes; manual `on_hold` override) — completeness itself is
   never stored.
9. **Reminders**: rules in org settings (offsets pre/post due date, DD-incomplete, temp-access-expiry);
   templates via the existing `email_templates` catalogue (new keys + `{{amount_due}}`-style vars);
   sends via existing `NotifyMany`+email; `communication_log` collection records every send (recipient,
   trigger, template, channel, auto/manual, staff). **Needs the one genuinely new piece of infrastructure:
   a small in-process scheduler** (ticker in `cmd/api`, org-aware, idempotent per rule+target+day).
10. **Stripe extension** (in `platform/stripe`): Customer per family; **Bacs Direct Debit via Checkout in
    setup mode** (mandate acquisition) + PaymentIntents (`payment_method_types: ["bacs_debit"]`) charged
    off-session per schedule; store ONLY provider IDs + status. Webhook handler EXTENDS the existing
    verified endpoint (new event types: `setup_intent.succeeded`, `mandate.updated`,
    `payment_intent.succeeded/failed/processing`, `charge.refunded/dispute`), same idempotency discipline
    (event-id guard). Internal statuses mapped from provider events — provider strings never leak upward.

### Permissions (extend `models/permission.go`, no second mechanism)
`finance.view`, `finance.manage`, `finance.adjust` (credits/write-offs/refunds), `parents.manage`,
`induction.review`, `reminders.send`. Grants: super_admin/admin/director all; branch_manager view+manage
(own branch via policy scope); `finance` role gains view/manage/adjust cross-branch; staff none.
Parent (customer role) endpoints live under a **new `/portal` route group**: `Auth` + customer role +
a `parentScope` middleware resolving user→parent→authorised children (IDOR-proof server-side; every
portal query filters by that set).

### Route sketch (follows existing conventions)
- Admin: `/admin/parents[...]`, `/admin/families[...]`, `/admin/children/{id}/parents|induction|onboarding|consents`,
  `/admin/finance/dashboard|charges|payments|reminders`, `/admin/onboarding` (board).
- Portal: `/portal/me`, `/portal/children`, `/portal/children/{id}` (+induction save/submit, consents),
  `/portal/finance` (balance, schedule, payments), `/portal/direct-debit/setup` (Checkout session),
  invitation: `POST /auth/invite/accept` (token → set password; token hashed at rest, single-use, expiring).

---

## Part D — REUSE / REFACTOR / REMOVE / EXTEND / CREATE

- **REUSE**: TenantCollection, counters/refs, RequirePermission+policy scoping, AuditService, NotifyMany+email,
  email_templates engine, taxonomy/org-settings config pattern, PickerModal/StageBadge/Card UI kit,
  Stripe webhook verification + idempotency discipline, bnrest platform, `/auth/login` for parents.
- **REFACTOR**: `Child.guardians` → Parent+relationship canonical model (projection during migration window);
  enquiry Register → also create/link Parent (from enquiry contact) + family; child profile → tabbed record.
- **REMOVE (after migration)**: guardian editing UI in child create/edit; embedded guardian writes.
- **EXTEND**: Permission set + finance role; webhook handler (new events); notification catalogue (new types);
  email-template catalogue (reminder/invite templates); org settings (onboarding weights, temp-access policy,
  reminder rules, first-payment rule); audit entries gain optional before/after values.
- **CREATE**: parents, child_parent_relationships, families, child_inductions, consents, charges, payments,
  payment_allocations, payment_schedules, communication_log; invitation flow; portal route group + UI;
  finance + onboarding dashboards; scheduler.

---

## Part E — Implementation sequence (each phase = full pipeline: build → unit → bnrest → UI → commit)

1. **P3 Parents & relationships** (foundation): entities, migration from embedded guardians, enquiry-register
   linking, admin parent profile + child Parents tab (PickerModal), invitation/activation flow, `/portal` shell
   with auth scoping. *Tests: relationship CRUD, sibling/multi-guardian, IDOR (parent A cannot read child B),
   invite token single-use/expiry.*
2. **P4 Induction & consents**: induction model/sections per the PDF, save/resume (portal + admin),
   write-through to canonical fields, consent catalogue + records, manager review/sign-off, completeness
   engine + onboarding derivation + manager board. *Tests: partial save, canonical write-through,
   completeness math (unit), review flow.*
3. **P5 Finance**: families/charges/payments/allocations/schedule, Stripe customer + Bacs DD setup,
   webhook extension, first-payment recognition, portal finance page, manager finance dashboard,
   finance RBAC. *Tests: allocation math, status mapping, webhook idempotency/duplicates, balance accuracy.*
4. **P6 Onboarding automation + portal access policy**: temp-access expiry, requirement-driven activation,
   manual overrides (audited), notifications. 5. **P7 Reminders**: scheduler, rules, templates, manual/bulk,
   communication log. 6. **P8 Final QA**: full COL-FUNC-001 + legacy regression + E2E happy/failure paths.

---

## Part F — Decisions (resolved 2026-08-11)

1. **Direct Debit rails**: Stripe **Bacs Direct Debit** must be enabled on the Stripe account (UK,
   activation required; settlement T+3). Alternative: GoCardless. Plan assumes **Stripe Bacs** to reuse the
   existing integration. → confirm the Stripe account has/can enable Bacs.
2. **Fee amounts**: first-payment amount and monthly schedule derived from `fee_configs` + child sessions
   (computed quote), or manager-entered per family? Plan assumes **manager-confirmed amount prefilled from
   the fee calculator**.
3. **Portal domain**: `/portal/*` inside the existing frontend app (assumed) vs subdomain.
4. **Deposit**: the form references deposits; is the "first payment" a deposit, first month, or both?
