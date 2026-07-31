# Opportunity Cost & Yield — design spec

Status: **draft / not started**. Owner: platform. Audience: MD (Command Centre) + admissions/finance.

## 1. Purpose

Quantify the revenue a branch is leaving on the table and turn it into a **targeting action**:

- Promote **available places** to parents seeking **funded** (government-subsidised) options — fill empty seats.
- Promote **premium / full-day / flexible** packages to parents willing to **pay full fees** — protect margin on scarce, high-demand slots.

The engine that decides *which parent gets which message* is the **opportunity-cost calculation per room × session × period**, gated by whether that slot is actually scarce.

## 2. The two opportunity costs (do not conflate them)

### A. Empty-capacity cost — foregone revenue from unsold places

```
empty_cost = (capacity_hours − occupied_hours) × private_rate × fill_probability
```

An empty seat earns nothing. `fill_probability` (0–1) discounts by how realistically that specific slot fills (a Sept pre-school place ≠ a Tue-PM baby place). Early phases can set `fill_probability = 1` and refine later from history.

### B. Funding-mix cost — margin lost when a funded child displaces a full-fee child

```
mix_cost = funded_hours × (private_rate − funded_rate)
```

Government funded hours pay a fixed rate usually **below** the private rate. A funded child in a seat a full-fee family wanted costs you that margin.

### The rule that ties them together

**Funding-mix cost only bites when the room is at/near capacity.**

| Slot state (per room × session × period) | Real opportunity cost | Classification | Target segment | Promote |
|---|---|---|---|---|
| `available > 0` (gaps exist) | **empty_cost** — mix_cost = 0 | `FILL` | Funding-seekers | "Funded places available" → fill seat, then upsell add-ons |
| `available ≤ 0` + waitlist > 0 (scarce) | **mix_cost** | `OPTIMISE` | Full-pay | Premium / full-day / flexible; stretch funded families onto paid extra hours |
| `available ≈ 0`, no waitlist | ~0 (balanced) | `HOLD` | — | Maintain; watch |

Reason: when seats are empty, a funded child beats an empty seat — funding revenue > £0 — so funded enrolment has **zero** opportunity cost. Mix cost is real **only** when you're turning full-fee families away to honour funded places.

## 3. What already exists (grounded in the codebase)

| # | Thing | State | Where |
|---|---|---|---|
| 1 | Room capacity + staff ratio | ✅ | `models/room.go` — `Capacity int`, `StaffRatio int`, `AgeRange string`, `BranchSlug` |
| 2 | Branch age groups + opening hours | ✅ | `models/branch.go` — `AgeGroups []string`, `OpeningHours []BranchHours`, `Capacity` (fallback) |
| 3 | Child funding flag + session pattern | ⚠️ partial | `models/child.go` — `FundingType` (`none`\|`15h`\|`30h`), `Sessions []ChildSession{Day, Type: full\|am\|pm\|school}`, `Status` (`active`\|`waitlist`\|`left`) |
| 4 | Occupancy stats | ✅ | `service/child.go` `Stats()` → `ChildStats{Capacity, Available, OccupancyRate, ByBranch, ByAgeGroup}` — `GET /admin/children/stats` |
| 5 | Forward capacity forecast (per room, per week, AM/PM) | ✅ | `service/child.go` `CapacityForecast()` → `RoomCapacityForecast{AMChildren, AMAvailable, AMStaffRequired, PM…}` |
| 6 | Session→hours mapping | ✅ (frontend) | `SESSION_HOURS`: `full_day:10, school:7, morning:5, afternoon:5` |
| 7 | Waitlist / demand | ⚠️ partial | Child `Status="waitlist"` count; enquiry funnel `EnquiryStats` |
| 8 | **Rate card (private + funded rates)** | ❌ **frontend-only** | `frontend/lib/fee-data.json` (per branch × age × session: `{daily, weekly}`, `earlyBird`, `stdFunded`); `FeeQuote` snapshot on enquiry. **No backend model, no Child↔rate link.** |
| 9 | Funding rules as config | ❌ aspirational | `OrgSettings` has only `Timezone/Currency/Features` |

**The one real gap: there is no operational £ per child / room / session in the backend.** Everything else needed for opportunity cost is already computed live. So this feature is mostly (a) promoting the rate card into a real tenant-scoped model, (b) deriving each child's funded/private hour split, (c) a thin calc service over data that already exists.

## 4. New backend data — a tenant-scoped Tariff (rate card)

Promote `fee-data.json` into a real model (standard slice: model → repo → service → handler → routes under `RequirePermission` → response envelope). Tenant-aware (`OrgID`) per the platform rules.

```go
// models/tariff.go — collection "tariffs"
type Tariff struct {
    ID         primitive.ObjectID
    OrgID      primitive.ObjectID  // tenant discriminator (auto-stamped by TenantCollection)
    BranchSlug string              // "" = org default, else per-branch override
    AgeBand    string              // canonical band key (see §5) — "under_2" | "2_3" | "3_plus"
    Session    string              // "full_day" | "morning" | "afternoon" | "school"
    PrivateRate float64            // £/hour, full fee
    FundedRate  float64            // £/hour reimbursed by government (0 if not fundable at this band)
    AddOns     []TariffAddOn       // meals, consumables, wraparound — per-session or per-day £
    Currency   string             // inherit OrgSettings.Currency
    EffectiveFrom, EffectiveTo *time.Time
    CreatedAt, UpdatedAt time.Time
}
```

Plus **funding rules** as org/branch config (closes the §9 gap) — the entitlement caps used in §5:

```go
// on OrgSettings (or a FundingConfig sub-doc)
type FundingRule struct {
    Code            string  // "15h" | "30h"  (matches Child.FundingType)
    WeeklyHours     float64 // 15, 30
    TermWeeks       int     // 38 (term-time) — used for stretch math
    StretchWeeks    int     // 52 if stretched
    EligibleAgeBands []string
}
```

Seed the initial Tariff + FundingRule rows **from `fee-data.json`** so day-one values match the live marketing calculator (single source of truth going forward).

## 5. Deriving funded vs private hours (no new Child field needed)

`Child` only stores a `FundingType` flag, not a funded/private split. Derive it:

```
booked_hours(child)   = Σ over Sessions of SESSION_HOURS[session.Type]   // per week
entitlement(child)    = FundingRule[child.FundingType].WeeklyHours       // 0 / 15 / 30
funded_hours(child)   = min(booked_hours, entitlement)
private_hours(child)  = booked_hours − funded_hours
```

Age band: normalise `Room.AgeRange` / DOB into the canonical `under_2 | 2_3 | 3_plus` keys already used by `service/child.go` `Stats()` bucketing. Rate lookup = `Tariff[branch, ageBand, session]` with branch→org-default fallback.

Per-child weekly revenue (needed for the £ side):
```
revenue(child) = funded_hours × fundedRate + private_hours × privateRate + addOns
```

## 6. Core calculation, per Room × Session-band × Period

Aggregate children by room + session slot (AM/PM already modelled in `CapacityForecast`):

```
capacity_hours  = Room.Capacity × operating_hours(slot, period)
occupied_hours  = Σ booked_hours of active children in slot
available       = Room.Capacity − children_in_slot          // reuse AMAvailable/PMAvailable
funded_hours    = Σ funded_hours of children in slot
demand          = waitlist_count(room/branch/age) from Status="waitlist" + enquiry funnel

empty_cost = max(0, capacity_hours − occupied_hours) × privateRate × fill_probability
mix_cost   = (available ≤ 0 && demand > 0) ? funded_hours × (privateRate − fundedRate) : 0

opportunity_cost = empty_cost + mix_cost
classification   = available > 0 ? FILL : (demand > 0 ? OPTIMISE : HOLD)
```

Roll up room → branch → org. Forward-looking variant: run over `CapacityForecast` weeks instead of the current roster (caveat already documented there: no term/leaving dates yet).

## 7. Output contract (drives the UI + campaigns)

```jsonc
GET /admin/yield/opportunity   // RequirePermission(analytics/finance), tenant-scoped
{
  "org_wide": { "empty_cost_weekly": 4120, "mix_cost_weekly": 615, "occupancy": 0.91 },
  "branches": [{
    "branch": "harrow",
    "empty_cost_weekly": 765, "mix_cost_weekly": 225,
    "rooms": [{
      "room": "Toddlers", "age_band": "2_3",
      "slots": [{
        "session": "morning", "capacity": 12, "filled": 9, "available": 3,
        "funded_hours": 75, "private_hours": 60,
        "empty_cost": 382.50, "mix_cost": 0,
        "classification": "FILL",
        "action": { "segment": "funding_seekers", "message_key": "funded_places_available", "count": 3 }
      }]
    }]
  }],
  "actions": [
    { "branch": "harrow", "room": "Toddlers", "classification": "FILL",
      "headline": "3 funded-eligible gaps → run funded campaign", "value_weekly": 382.50 },
    { "branch": "wembley", "room": "Pre-school", "classification": "OPTIMISE",
      "headline": "Full + 6 waitlist → promote premium day rate", "value_weekly": 225 }
  ]
}
```

The `actions[]` list is the deliverable — a ranked, £-quantified worklist that answers your original question directly.

## 8. UI

**Command Centre widget — "Opportunity Cost & Yield"** (fits the existing `os/OpsWorkspace` panel system; sits beside occupancy). Per branch/room: £ lost to empty seats, £ lost to sub-optimal mix, utilisation, and the auto-generated action list. Wire via a `live.ts` hook (`useYield()`) with mock fallback, exactly like `useChildrenStats`. Later: a one-click "launch funded campaign / premium campaign" that hands the segment to the marketing/enquiry layer.

## 9. Phasing

1. **T1a — Tariff model + FundingRule config**, seeded from `fee-data.json`. Backend only. (Also unblocks putting real £ into the Command Centre finance panels, which are all mock today.)
2. **T1b — Yield service** (`service/yield.go`): funded/private derivation + §6 formulas + `GET /admin/yield/opportunity`.
3. **A1 — Command Centre widget** + action list.
4. **A1+ — Campaign hand-off**: FILL actions → funded-audience campaign; OPTIMISE actions → premium-audience campaign (ties into the enquiry/marketing modules).

## 10. Open assumptions to confirm

- **Entitlement model**: treat 15h/30h as flat weekly caps (term-time) initially; stretch (38→52wk) math is a v2 refinement using `FundingRule.StretchWeeks`.
- **2-year-old / 9-month funding**: `FundingType` enum currently has only `none/15h/30h`. Add codes when those cohorts matter.
- **fill_probability**: start at 1.0; derive from historical fill-time per slot later.
- **Add-ons** (meals, consumables, wraparound) modelled on `Tariff` but can be phase-2 if you want the first cut to be pure hourly.
