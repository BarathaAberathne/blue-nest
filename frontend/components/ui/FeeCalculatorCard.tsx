"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Baby, GraduationCap, Users } from "lucide-react";
import feeData from "@/lib/fee-data.json";

// ── Types ─────────────────────────────────────────────────────────────────────

type DiscountId = "none" | "sibling" | "staff";
const DISCOUNTS: { id: DiscountId; label: string; rate: number }[] = [
  { id: "none",    label: "None",          rate: 0    },
  { id: "sibling", label: "Sibling −10%",  rate: 0.10 },
  { id: "staff",   label: "Staff −50%",    rate: 0.50 },
];

// Year-basis pill: term-time only (38 funded weeks) or all year round
// (38 funded term weeks + 14 full-fee holiday weeks). Funding is a term-time
// entitlement, so holiday weeks are billed at the standard unfunded rate — the
// full-year monthly figure blends the two.
type YearWeeks = 38 | 52;
const TERM_WEEKS = 38; // government-funded term-time weeks in a year
const YEAR_WEEKS_OPTIONS: { id: YearWeeks; title: string; sub: string }[] = [
  { id: 38, title: "Term time only", sub: "38 weeks — funded weeks only" },
  { id: 52, title: "All year round", sub: "52 weeks — holidays at full fee" },
];

// Funding option. TFC is information-only — does not reduce the fee.
type FundingId = "none" | "15h" | "30h" | "tfc";
const FUNDINGS: { id: FundingId; label: string }[] = [
  { id: "none", label: "None"      },
  { id: "15h",  label: "15 hrs"    },
  { id: "30h",  label: "30 hrs"    },
  { id: "tfc",  label: "Tax-Free"  },
];
// Weekly funded-hours allowance, applied in full during the 38 term weeks.
// Funding is a term-time entitlement — it is NOT stretched across the year;
// holiday weeks carry no funding and are billed at the full fee.
const FUNDING_HOURS_PER_WEEK: Record<FundingId, number> = {
  none: 0, "15h": 15, "30h": 30, tfc: 0,
};

// Session lengths in hours — used to count how many sessions a funding
// allowance covers per week.
const SESSION_HOURS: Record<SessionId, number> = {
  full_day: 10, school: 7, morning: 5, afternoon: 5,
};

// Props use hyphenated slugs; JSON uses space variant for "pinner green"
type BranchProp = "harrow" | "pinner" | "borehamwood" | "pinner-green" | "northwood";
type JsonBranchKey = keyof typeof feeData.branches;
type AgeGroupId = "0-2" | "2-3" | "3-5";
type SessionId  = "full_day" | "morning" | "afternoon" | "school";

// Map prop slug → JSON key
const BRANCH_JSON_KEY: Record<BranchProp, JsonBranchKey> = {
  harrow:        "harrow",
  pinner:        "pinner",
  borehamwood:   "borehamwood",
  "pinner-green": "pinner green",
  northwood:     "northwood",
};

const BRANCH_LABELS: Record<BranchProp, string> = {
  harrow:        "Harrow",
  pinner:        "Pinner",
  borehamwood:   "Borehamwood",
  "pinner-green": "Pinner Green",
  northwood:     "Northwood",
};

const ALL_BRANCHES: BranchProp[] = ["harrow", "pinner", "borehamwood", "pinner-green", "northwood"];

const AGE_GROUPS: { id: AgeGroupId; label: string; icon: typeof Baby }[] = [
  { id: "0-2", label: "3 months–2 yrs", icon: Baby },
  { id: "2-3", label: "2–3 yrs",        icon: Users },
  { id: "3-5", label: "3–5 yrs",        icon: GraduationCap },
];

// Per-day scheduling: parents pick a session (or a day off) for each weekday,
// rather than just a day-count — so mixed weeks (e.g. two full days + one
// morning) price correctly.
type Weekday = "mon" | "tue" | "wed" | "thu" | "fri";
type DayChoice = SessionId | "off";
type DaySchedule = Record<Weekday, DayChoice>;

const WEEKDAYS: { id: Weekday; label: string }[] = [
  { id: "mon", label: "Mon" },
  { id: "tue", label: "Tue" },
  { id: "wed", label: "Wed" },
  { id: "thu", label: "Thu" },
  { id: "fri", label: "Fri" },
];

// Options offered in each day's dropdown ("off" = not attending that day).
// Labels carry the real drop-off–pick-up times in AM/PM so parents can see
// exactly what each session means.
const DAY_OPTIONS: { id: DayChoice; label: string; short: string }[] = [
  { id: "off",       label: "Not attending",                short: "Off" },
  { id: "full_day",  label: "Full Day · 8:00 AM – 6:00 PM",   short: "Full Day" },
  { id: "morning",   label: "Morning · 8:00 AM – 1:00 PM",    short: "Morning" },
  { id: "afternoon", label: "Afternoon · 1:00 PM – 6:00 PM",  short: "Afternoon" },
  { id: "school",    label: "School Day · 9:00 AM – 4:00 PM", short: "School" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function getBranchData(branch: BranchProp) {
  return feeData.branches[BRANCH_JSON_KEY[branch]];
}

function getAvailableAgeGroups(branch: BranchProp): AgeGroupId[] {
  const groups = getBranchData(branch).ageGroups;
  return AGE_GROUPS.map((g) => g.id).filter((id) => id in groups);
}

interface Quote {
  gross: number;                 // full weekly cost without funding (also the holiday-week rate)
  termWeekly: number;            // net weekly during term time (funded), after discount
  holidayWeekly: number;         // net weekly during holidays (full fee), after discount
  fundingOffset: number;         // avg weekly saving from funding vs full fee (>=0)
  discountAmount: number;        // avg weekly discount (display)
  weekly: number;                // blended average net weekly = annual / yearWeeks
  monthly: number;               // annual net / 12
  fundedSessions: number;        // sessions/week covered by funding (term time)
  bookedDays: number;            // number of weekdays with a booked session
  holidayWeeks: number;          // full-fee holiday weeks billed (0 on the term-time basis)
}

function computeQuote(
  branch: BranchProp,
  ageGroup: AgeGroupId,
  schedule: DaySchedule,
  earlyBird: boolean,
  discount: DiscountId,
  yearWeeks: YearWeeks,
  funding: FundingId,
): Quote {
  const branchData   = getBranchData(branch);
  const ageGroupData = branchData.ageGroups[ageGroup as keyof typeof branchData.ageGroups];

  // Booked sessions, in weekday order (days off skipped).
  const booked      = WEEKDAYS.map((d) => schedule[d.id]).filter((c): c is SessionId => c !== "off");
  const bookedDays  = booked.length;
  const holidayWks  = yearWeeks - Math.min(yearWeeks, TERM_WEEKS);

  // Defensive: missing age band (e.g. Pinner has no 0-2 row) or an empty week
  // — bail out with a zero quote instead of throwing.
  if (!ageGroupData || bookedDays === 0) {
    return {
      gross: 0, termWeekly: 0, holidayWeekly: 0, fundingOffset: 0, discountAmount: 0,
      weekly: 0, monthly: 0, fundedSessions: 0, bookedDays, holidayWeeks: holidayWks,
    };
  }

  const stdFunded = ageGroup === "3-5" ? branchData.stdFunded.above3 : branchData.stdFunded.below3;
  const items = booked.map((s) => ({
    hours:      SESSION_HOURS[s],
    daily:      ageGroupData[s].daily,
    fundedRate: stdFunded[s],
  }));

  // Full unfunded weekly (= the holiday-week rate). Preserve the 5-day weekly
  // bundle price only when all five days are the SAME session (the fee sheet's
  // block rate); mixed weeks are summed per booked day.
  const uniformFullWeek = bookedDays === 5 && booked.every((s) => s === booked[0]);
  const sumDailies      = items.reduce((t, it) => t + it.daily, 0);
  const baseStandard    = uniformFullWeek ? ageGroupData[booked[0]].weekly : sumDailies;
  const earlyBirdCost   = earlyBird ? branchData.earlyBird * bookedDays : 0;
  const gross           = baseStandard + earlyBirdCost;

  // Funding is a TERM-TIME entitlement: the full weekly hours allowance is used
  // during the 38 term weeks (never stretched; holidays are full-fee). Allocate
  // that budget across the booked sessions, funding whole sessions, biggest £
  // saving first so the parent gets the most value. With identical sessions
  // this reduces to floor(budget / sessionHours).
  let budget = FUNDING_HOURS_PER_WEEK[funding];
  const funded = new Array(items.length).fill(false);
  const order  = items.map((it, i) => ({ i, saving: it.daily - it.fundedRate }))
                      .sort((a, b) => b.saving - a.saving);
  for (const { i } of order) {
    if (budget >= items[i].hours) { funded[i] = true; budget -= items[i].hours; }
  }
  const fundedSessions = funded.filter(Boolean).length;

  // Funded sessions charged at the top-up rate, the rest at full daily. When
  // nothing is funded, fall back to baseStandard so the weekly bundle still
  // applies to a uniform full week.
  const termFundedBase  = fundedSessions === 0
    ? baseStandard
    : items.reduce((t, it, i) => t + (funded[i] ? it.fundedRate : it.daily), 0);
  const termWeeklyGross = termFundedBase + earlyBirdCost; // funded weekly, during term

  // Year basis: 38 = term-time only (no holidays billed); 52 = all year
  // (38 funded term weeks + the remaining full-fee holiday weeks).
  const termWeeks    = Math.min(yearWeeks, TERM_WEEKS);
  const holidayWeeks = yearWeeks - termWeeks;

  const discountRate = DISCOUNTS.find((d) => d.id === discount)!.rate;
  const keep         = 1 - discountRate;

  const termWeekly    = termWeeklyGross * keep;   // net funded weekly (term time)
  const holidayWeekly = gross * keep;             // net full-fee weekly (holidays)

  // Blend term-time + holiday weeks across the year, then average.
  const annualGross    = termWeeks * termWeeklyGross + holidayWeeks * gross;
  const annualNet      = annualGross * keep;
  const monthly        = annualNet / 12;
  const weekly         = yearWeeks > 0 ? annualNet / yearWeeks : 0; // blended avg net/week

  // Savings expressed per average week for the footer notes.
  const discountAmount = yearWeeks > 0 ? (annualGross - annualNet) / yearWeeks : 0;
  const fundingOffset  = Math.max(0, holidayWeekly - weekly); // avg weekly saving vs full fee

  return { gross, termWeekly, holidayWeekly, fundingOffset, discountAmount, weekly, monthly, fundedSessions, bookedDays, holidayWeeks };
}

// Eligibility / informational copy shown beneath the Funding chips.
// Strings are keyed by `${funding}_${ageGroup}` so the lookup is O(1).
// The component always renders a fixed-height paragraph; missing keys
// resolve to an empty string and the paragraph stays empty but sized.
const FUNDING_INFO: Record<string, string> = {
  "tfc_0-2": "Tax-Free Childcare can save up to 20% on top of nursery fees (up to £2,000/yr/child). Apply at childcarechoices.gov.uk.",
  "tfc_2-3": "Tax-Free Childcare can save up to 20% on top of nursery fees (up to £2,000/yr/child). Apply at childcarechoices.gov.uk.",
  "tfc_3-5": "Tax-Free Childcare can save up to 20% on top of nursery fees (up to £2,000/yr/child). Apply at childcarechoices.gov.uk.",
  "15h_0-2": "Funded hours typically begin at 9 months for eligible working families. Please confirm eligibility with our team.",
  "15h_2-3": "Universal 15h applies from age 3. Two-year-olds may receive 15h with extra support. Please confirm with our team.",
  "15h_3-5": "Funded hours cover the 38 term-time weeks. Choosing 'all year' adds the holiday weeks at the standard (unfunded) rate. Meals & extras still chargeable.",
  "30h_0-2": "30h funding from 9 months for eligible working parents. Please confirm eligibility with our team.",
  "30h_2-3": "30h funding for eligible working parents. Universal 15h applies from age 3. Confirm eligibility with our team.",
  "30h_3-5": "Funded hours cover the 38 term-time weeks. Choosing 'all year' adds the holiday weeks at the standard (unfunded) rate. Meals & extras still chargeable.",
};

function fmt(n: number) {
  return `£${n.toFixed(0)}`;
}

// ── Chip ──────────────────────────────────────────────────────────────────────

function Chip<T extends string>({
  value, selected, onClick, children, small,
}: {
  value: T;
  selected: boolean;
  onClick: (v: T) => void;
  children: React.ReactNode;
  small?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => onClick(value)}
      className={`rounded-full font-bold transition-all duration-200 ${
        small ? "px-2.5 py-1 text-[0.65rem]" : "px-3 py-1.5 text-xs"
      } ${
        selected
          ? "bg-[#6ecfc9] text-white shadow-[0_3px_10px_rgba(110,207,201,0.40)]"
          : "bg-[rgba(127,216,210,0.12)] text-[var(--ink)] hover:bg-[rgba(127,216,210,0.25)]"
      }`}
    >
      {children}
    </button>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function FeeCalculatorCard({
  compact = false,
  defaultBranch = "harrow",
}: {
  compact?: boolean;
  defaultBranch?: BranchProp;
}) {
  const [branch, setBranch]       = useState<BranchProp>(defaultBranch);
  const [ageGroup, setAgeGroup]   = useState<AgeGroupId>("2-3");
  const [schedule, setSchedule]   = useState<DaySchedule>({
    mon: "full_day", tue: "full_day", wed: "full_day", thu: "full_day", fri: "full_day",
  });
  const [earlyBird, setEarlyBird] = useState(false);
  const [discount, setDiscount]   = useState<DiscountId>("none");
  const [yearWeeks, setYearWeeks] = useState<YearWeeks>(52);
  const [funding, setFunding]     = useState<FundingId>("none");

  // Guard: if branch doesn't have the selected age group, pick first available
  const available = getAvailableAgeGroups(branch);
  const safeAgeGroup: AgeGroupId = available.includes(ageGroup) ? ageGroup : available[0];

  function handleBranchChange(b: BranchProp) {
    setBranch(b);
    const avail = getAvailableAgeGroups(b);
    if (!avail.includes(ageGroup)) setAgeGroup(avail[0]);
  }

  const setDay     = (day: Weekday, choice: DayChoice) => setSchedule((s) => ({ ...s, [day]: choice }));
  const setAllDays = (choice: DayChoice) =>
    setSchedule({ mon: choice, tue: choice, wed: choice, thu: choice, fri: choice });

  const quote = computeQuote(
    branch, safeAgeGroup, schedule, earlyBird, discount, yearWeeks, funding,
  );
  const { gross, fundingOffset, discountAmount, weekly, monthly, termWeekly, holidayWeekly, holidayWeeks, bookedDays } = quote;

  const fundingInfo = FUNDING_INFO[`${funding}_${safeAgeGroup}`] ?? "";

  const AgeIcon = AGE_GROUPS.find((g) => g.id === safeAgeGroup)!.icon;

  return (
    <div
      className={`w-full overflow-hidden rounded-[2rem] bg-[rgba(255,253,249,0.97)] shadow-[0_16px_50px_rgba(90,74,66,0.14)] ring-2 ring-[rgba(127,216,210,0.35)] backdrop-blur-sm ${compact ? "" : "max-w-[26rem]"}`}
    >
      {/* ── Header ────────────────────────────────────────────── */}
      <div
        className="px-5 py-3"
        style={{ background: "linear-gradient(135deg, #8ee2dc 0%, #60c9c3 60%, #54b9b3 100%)" }}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/25">
            <AgeIcon className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="font-heading text-[1.45rem] leading-none text-white">Estimate Your Fees</p>
            <p className="mt-0.5 text-[0.72rem] text-white/85">
              {BRANCH_LABELS[branch]} · indicative costs
            </p>
          </div>
        </div>
      </div>

      {/* ── Controls ──────────────────────────────────────────── */}
      <div className="space-y-3 px-5 py-4">

        {/* Branch */}
        <div>
          <p className="mb-2 text-[0.62rem] font-bold uppercase tracking-[0.18em] text-[var(--muted)]">Which nursery?</p>
          <div className="flex flex-wrap gap-1.5">
            {ALL_BRANCHES.map((b) => (
              <Chip key={b} value={b} selected={branch === b} onClick={handleBranchChange} small>
                {BRANCH_LABELS[b]}
              </Chip>
            ))}
          </div>
        </div>

        {/* Age group */}
        <div>
          <p className="mb-2 text-[0.62rem] font-bold uppercase tracking-[0.18em] text-[var(--muted)]">Child&apos;s age</p>
          <div className="flex flex-wrap gap-2">
            {AGE_GROUPS.filter((g) => available.includes(g.id)).map((g) => {
              const Icon = g.icon;
              return (
                <Chip key={g.id} value={g.id} selected={safeAgeGroup === g.id} onClick={setAgeGroup}>
                  <span className="flex items-center gap-1.5">
                    <Icon className="h-3 w-3" />
                    {g.label}
                  </span>
                </Chip>
              );
            })}
          </div>
        </div>

        {/* Weekly schedule — a session (or day off) per weekday */}
        <div>
          <p className="mb-2 text-[0.62rem] font-bold uppercase tracking-[0.18em] text-[var(--muted)]">
            Weekly schedule —{" "}
            <span className="font-extrabold text-[var(--ink)]">
              {bookedDays} day{bookedDays !== 1 ? "s" : ""}
            </span>
          </p>
          <p className="mb-2 text-[0.62rem] leading-snug text-[var(--muted)]">
            Choose a session for each day your child attends — times shown are drop-off to pick-up.
          </p>

          {/* Quick presets: set every weekday at once */}
          <div className="mb-2 flex flex-wrap gap-1.5">
            {DAY_OPTIONS.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => setAllDays(o.id)}
                className="rounded-full bg-[rgba(127,216,210,0.12)] px-2.5 py-1 text-[0.6rem] font-bold text-[var(--ink)] transition-colors hover:bg-[rgba(127,216,210,0.28)]"
              >
                {o.id === "off" ? "Clear all" : `All ${o.short}`}
              </button>
            ))}
          </div>

          {/* Per-day session selectors */}
          <div className="space-y-1.5">
            {WEEKDAYS.map((d) => (
              <div key={d.id} className="flex items-center gap-2">
                <span className="w-9 shrink-0 text-[0.72rem] font-bold text-[var(--ink)]">{d.label}</span>
                <select
                  value={schedule[d.id]}
                  onChange={(e) => setDay(d.id, e.target.value as DayChoice)}
                  aria-label={`${d.label} session`}
                  className={`flex-1 cursor-pointer rounded-lg border px-2 py-1.5 text-xs font-semibold outline-none transition-colors ${
                    schedule[d.id] === "off"
                      ? "border-[rgba(90,74,66,0.12)] bg-[rgba(90,74,66,0.03)] text-[var(--muted)]"
                      : "border-[rgba(127,216,210,0.5)] bg-[rgba(127,216,210,0.1)] text-[var(--ink)]"
                  }`}
                >
                  {DAY_OPTIONS.map((o) => (
                    <option key={o.id} value={o.id}>{o.label}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>

        {/* Early bird toggle */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[0.62rem] font-bold uppercase tracking-[0.18em] text-[var(--muted)]">Early drop-off</p>
            <p className="text-[0.6rem] text-[var(--muted)]">+£{getBranchData(branch).earlyBird}/day · 7:30 AM – 8:00 AM</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={earlyBird}
            aria-label="Toggle early drop-off 7:30 AM"
            onClick={() => setEarlyBird((v) => !v)}
            className={`relative h-6 w-11 shrink-0 rounded-full overflow-hidden transition-colors duration-200 ${
              earlyBird ? "bg-[#6ecfc9]" : "bg-[rgba(90,74,66,0.15)]"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                earlyBird ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {/* Discount */}
        <div>
          <p className="mb-2 text-[0.62rem] font-bold uppercase tracking-[0.18em] text-[var(--muted)]">Discount</p>
          <div className="flex flex-wrap gap-1.5">
            {DISCOUNTS.map((d) => (
              <Chip key={d.id} value={d.id} selected={discount === d.id} onClick={setDiscount} small>
                {d.label}
              </Chip>
            ))}
          </div>
        </div>

        {/* Government funding */}
        <div>
          <p className="mb-1 text-[0.62rem] font-bold uppercase tracking-[0.18em] text-[var(--muted)]">Government funding</p>
          <p className="mb-2 text-[0.62rem] leading-snug text-[var(--muted)]">
            Funded hours are a term-time entitlement, applied to your booked sessions.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {FUNDINGS.map((f) => (
              <Chip key={f.id} value={f.id} selected={funding === f.id} onClick={setFunding} small>
                {f.label}
              </Chip>
            ))}
          </div>
          {/*
            Reserved info area — always renders to keep the card height
            stable. When `funding` is "none" the lookup returns "" and
            the placeholder text is hidden with `invisible`. min-h fits
            two lines of the 0.6rem caveat copy.
          */}
          <p
            className={`mt-2 min-h-[2.5rem] text-[0.6rem] leading-snug text-[var(--muted)] ${fundingInfo ? "" : "invisible"}`}
            aria-hidden={!fundingInfo}
          >
            {fundingInfo || "Funding info placeholder."}
          </p>
        </div>

        {/* Weeks per year — the term-time vs all-year distinction, spelled out */}
        <div>
          <p className="mb-1 text-[0.62rem] font-bold uppercase tracking-[0.18em] text-[var(--muted)]">Weeks per year</p>
          <p className="mb-2 text-[0.62rem] leading-snug text-[var(--muted)]">
            Funding covers 38 term-time weeks. Pick &ldquo;all year round&rdquo; if your child also attends in
            the school holidays — those weeks are charged at the full (unfunded) rate.
          </p>
          <div className="grid gap-1.5">
            {YEAR_WEEKS_OPTIONS.map((y) => (
              <button
                key={y.id}
                type="button"
                onClick={() => setYearWeeks(y.id)}
                aria-pressed={yearWeeks === y.id}
                className={`rounded-xl border px-3 py-2 text-left transition-colors ${
                  yearWeeks === y.id
                    ? "border-[#6ecfc9] bg-[rgba(110,207,201,0.16)]"
                    : "border-[rgba(90,74,66,0.12)] bg-white/60 hover:bg-[rgba(127,216,210,0.10)]"
                }`}
              >
                <span className="block text-[0.8rem] font-bold text-[var(--ink)]">{y.title}</span>
                <span className="block text-[0.62rem] text-[var(--muted)]">{y.sub}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Result — lead with the monthly fee, then show plainly how it's built up */}
        <div className="rounded-[1.25rem] bg-[rgba(127,216,210,0.12)] px-4 py-4 ring-1 ring-[rgba(127,216,210,0.25)]">
          <p className="text-[0.62rem] font-bold uppercase tracking-[0.15em] text-[var(--muted)]">Estimated fee</p>
          <p className="mt-0.5 font-heading text-[2.5rem] leading-none text-[var(--ink)]">
            {fmt(monthly)}
            <span className="ml-1 text-[1rem] text-[var(--muted)]">/ month</span>
          </p>
          <p className="mt-1 text-[0.68rem] text-[var(--muted)]">
            about {fmt(weekly)} per week, averaged across the year
          </p>

          {bookedDays === 0 ? (
            <p className="mt-3 border-t border-[rgba(127,216,210,0.25)] pt-2.5 text-[0.68rem] text-[var(--muted)]">
              Pick at least one session above to see a fee.
            </p>
          ) : (
            <div className="mt-3 space-y-1.5 border-t border-[rgba(127,216,210,0.25)] pt-2.5 text-[0.7rem]">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[var(--muted)]">Booked</span>
                <span className="font-semibold text-[var(--ink)]">
                  {bookedDays} day{bookedDays !== 1 ? "s" : ""}/week · {holidayWeeks > 0 ? "all year" : "term time"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-[var(--muted)]">Term-time weeks (38)</span>
                <span className="font-semibold text-[var(--ink)]">{fmt(termWeekly)}/wk</span>
              </div>
              {/*
                Rendered even on the term-time basis (then `invisible`) so the
                card — and therefore the hero pane it sizes — keeps a constant
                height when switching between "Term time only" and "All year
                round". Only this row differs between the two, so reserving it
                is enough to stop the hero resizing on that toggle.
              */}
              <div
                className={`flex items-center justify-between gap-3 ${holidayWeeks > 0 ? "" : "invisible"}`}
                aria-hidden={holidayWeeks <= 0}
              >
                <span className="text-[var(--muted)]">Holiday weeks ({holidayWeeks}) · full fee</span>
                <span className="font-semibold text-[var(--ink)]">{fmt(holidayWeekly)}/wk</span>
              </div>
              {earlyBird && (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[var(--muted)]">Early drop-off ×{bookedDays}</span>
                  <span className="font-semibold text-[var(--ink)]">+{fmt(getBranchData(branch).earlyBird * bookedDays)}/wk</span>
                </div>
              )}
              {fundingOffset > 0 && (
                <div className="flex items-center justify-between gap-3 text-[#3aada9]">
                  <span>Government funding saves</span>
                  <span className="font-semibold">≈ {fmt(fundingOffset)}/wk</span>
                </div>
              )}
              {discountAmount > 0 && (
                <div className="flex items-center justify-between gap-3 text-[#3aada9]">
                  <span>{DISCOUNTS.find((d) => d.id === discount)!.label} discount saves</span>
                  <span className="font-semibold">{fmt(discountAmount)}/wk</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* CTA */}
        <Link
          href={
            `/contact?enquiry=fee-enquiry` +
            `&q_branch=${branch}&q_age=${encodeURIComponent(safeAgeGroup)}` +
            `&q_schedule=${encodeURIComponent(WEEKDAYS.map((d) => schedule[d.id]).join(","))}&q_days=${bookedDays}&q_eb=${earlyBird}` +
            `&q_gross=${gross.toFixed(2)}&q_weekly=${weekly.toFixed(2)}&q_monthly=${monthly.toFixed(2)}` +
            `&q_discount=${discount}&q_discount_amount=${discountAmount.toFixed(2)}` +
            `&q_year_weeks=${yearWeeks}&q_funding=${funding}&q_offset=${fundingOffset.toFixed(2)}`
          }
          className="btn-primary flex w-full items-center justify-center gap-2 text-sm"
        >
          Get a personalised quote
          <ArrowRight className="h-4 w-4" />
        </Link>

        <p className="text-center text-[0.6rem] text-[var(--muted)]">
          {feeData.meta.note}
        </p>
      </div>
    </div>
  );
}
