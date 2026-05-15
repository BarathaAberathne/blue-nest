"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Baby, GraduationCap, Users } from "lucide-react";
import feeData from "@/lib/fee-data.json";

// ── Types ─────────────────────────────────────────────────────────────────────

type DiscountId = "none" | "sibling" | "staff";
const DISCOUNTS: { id: DiscountId; label: string; rate: number }[] = [
  { id: "none",    label: "No discount",   rate: 0    },
  { id: "sibling", label: "Sibling −10%",  rate: 0.10 },
  { id: "staff",   label: "Staff −50%",    rate: 0.50 },
];

// Year-basis pill: term-time (38) or full-year (52). Default 52 preserves
// the original behaviour (monthly = weekly * 52/12 = weekly * 4.33).
type YearWeeks = 38 | 52;
const YEAR_WEEKS_OPTIONS: { id: YearWeeks; label: string }[] = [
  { id: 38, label: "38 wks · term" },
  { id: 52, label: "52 wks · full year" },
];

// Funding option. TFC is information-only — does not reduce the fee.
type FundingId = "none" | "15h" | "30h" | "tfc";
const FUNDINGS: { id: FundingId; label: string }[] = [
  { id: "none", label: "No funding"      },
  { id: "15h",  label: "15h funded"      },
  { id: "30h",  label: "30h funded"      },
  { id: "tfc",  label: "Tax-Free info"   },
];
// Hours/week each option is worth at the 38-week term-time basis.
// Stretching across 52 weeks scales these down proportionally.
const FUNDING_HOURS_AT_38W: Record<FundingId, number> = {
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

const SESSIONS: { id: SessionId; label: string; note: string }[] = [
  { id: "full_day",  label: "Full Day",   note: "8:00am–6:00pm" },
  { id: "morning",   label: "Morning",    note: "8:00am–1:00pm" },
  { id: "afternoon", label: "Afternoon",  note: "1:00pm–6:00pm" },
  { id: "school",    label: "School Day", note: "9:00am–4:00pm" },
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
  gross: number;                 // weekly cost without funding (used for "standard" view)
  grossWithFunding: number;      // weekly cost after applying funded-session rates
  fundingOffset: number;         // gross - grossWithFunding (>=0; 0 for TFC and none)
  discountAmount: number;        // discount applied to grossWithFunding
  weekly: number;                // net weekly = grossWithFunding - discountAmount
  monthly: number;               // weekly * yearWeeks / 12
  fundedSessions: number;        // sessions/week covered by funding
}

function computeQuote(
  branch: BranchProp,
  ageGroup: AgeGroupId,
  session: SessionId,
  days: number,
  earlyBird: boolean,
  discount: DiscountId,
  yearWeeks: YearWeeks,
  funding: FundingId,
): Quote {
  const branchData   = getBranchData(branch);
  const ageGroupData = branchData.ageGroups[ageGroup as keyof typeof branchData.ageGroups];

  // Defensive: if a branch happens to be missing the chosen age band
  // (e.g. Pinner has no 0-2 row), bail out with a zero quote instead of
  // throwing. The UI's `safeAgeGroup` guard normally prevents this.
  if (!ageGroupData) {
    return {
      gross: 0, grossWithFunding: 0, fundingOffset: 0,
      discountAmount: 0, weekly: 0, monthly: 0, fundedSessions: 0,
    };
  }

  const rates         = ageGroupData[session];
  const baseStandard  = days === 5 ? rates.weekly : rates.daily * days;
  const earlyBirdCost = earlyBird ? branchData.earlyBird * days : 0;
  const gross         = baseStandard + earlyBirdCost;

  // Funded-session bookkeeping. When the parent picks 52-week stretching,
  // the per-week funded allowance shrinks (15h × 38/52 ≈ 10.96h, 30h ≈ 21.92h).
  const fundedHoursPerWeek = FUNDING_HOURS_AT_38W[funding] * (38 / yearWeeks);
  const sessionHours       = SESSION_HOURS[session];
  const fundedSessions     = Math.min(
    days,
    Math.floor(fundedHoursPerWeek / sessionHours),
  );
  const extraSessions = days - fundedSessions;

  // Replace funded sessions with the standard/funded per-session fee
  // (meals/extras still chargeable, encoded in this lower rate). When NO
  // sessions are funded (funding "none" or "tfc"), fall back to the
  // weekly-bundle rate so the default quote matches the standard fee
  // sheet exactly (5 days × daily is usually slightly more than weekly).
  const stdFunded     = branchData.stdFunded;
  const fundedRate    = ageGroup === "3-5"
    ? stdFunded.above3[session]
    : stdFunded.below3[session];
  const fundedBase    = fundedSessions === 0
    ? baseStandard
    : fundedSessions * fundedRate + extraSessions * rates.daily;
  const grossWithFunding = fundedBase + earlyBirdCost;

  // TFC is info-only: it never reduces the fee here. fundedSessions=0 for "none" and "tfc".
  const fundingOffset = Math.max(0, gross - grossWithFunding);

  const discountRate   = DISCOUNTS.find((d) => d.id === discount)!.rate;
  const discountAmount = grossWithFunding * discountRate;
  const weekly         = grossWithFunding - discountAmount;
  const monthly        = weekly * yearWeeks / 12;

  return { gross, grossWithFunding, fundingOffset, discountAmount, weekly, monthly, fundedSessions };
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
  "15h_3-5": "Funded hours normally cover 38 weeks. Stretching across 52 weeks reduces the weekly hours funded. Meals & extras still chargeable.",
  "30h_0-2": "30h funding from 9 months for eligible working parents. Please confirm eligibility with our team.",
  "30h_2-3": "30h funding for eligible working parents. Universal 15h applies from age 3. Confirm eligibility with our team.",
  "30h_3-5": "Funded hours normally cover 38 weeks. Stretching across 52 weeks reduces the weekly hours funded. Meals & extras still chargeable.",
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
  const [session, setSession]     = useState<SessionId>("full_day");
  const [days, setDays]           = useState(5);
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

  const quote = computeQuote(
    branch, safeAgeGroup, session, days, earlyBird, discount, yearWeeks, funding,
  );
  const { gross, fundingOffset, discountAmount, weekly, monthly } = quote;

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
          <p className="mb-2 text-[0.62rem] font-bold uppercase tracking-[0.18em] text-[var(--muted)]">Branch</p>
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

        {/* Session */}
        <div>
          <p className="mb-2 text-[0.62rem] font-bold uppercase tracking-[0.18em] text-[var(--muted)]">Session</p>
          <div className="flex flex-wrap gap-2">
            {SESSIONS.map((s) => (
              <Chip key={s.id} value={s.id} selected={session === s.id} onClick={setSession}>
                {s.label}
                <span className="ml-1 font-normal opacity-65">{s.note}</span>
              </Chip>
            ))}
          </div>
        </div>

        {/* Days slider */}
        <div>
          <p className="mb-2 text-[0.62rem] font-bold uppercase tracking-[0.18em] text-[var(--muted)]">
            Days per week —{" "}
            <span className="font-extrabold text-[var(--ink)]">
              {days} day{days !== 1 ? "s" : ""}
            </span>
          </p>
          <div className="px-2">
            <input
              type="range"
              min={1}
              max={5}
              step={1}
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="w-full accent-[#6ecfc9]"
              aria-label="Days per week"
            />
          </div>
          <div className="mt-3 flex justify-between text-[0.6rem] text-[var(--muted)]">
            {[1, 2, 3, 4, 5].map((d) => <span key={d}>{d}d</span>)}
          </div>
        </div>

        {/* Early bird toggle */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[0.62rem] font-bold uppercase tracking-[0.18em] text-[var(--muted)]">Early bird</p>
            <p className="text-[0.6rem] text-[var(--muted)]">+£{getBranchData(branch).earlyBird}/day · 7:30am–8:00am drop-off</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={earlyBird}
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

        {/* Year basis */}
        <div>
          <p className="mb-2 text-[0.62rem] font-bold uppercase tracking-[0.18em] text-[var(--muted)]">Annual basis</p>
          <div className="flex flex-wrap gap-1.5">
            {YEAR_WEEKS_OPTIONS.map((y) => (
              <Chip
                key={y.id}
                value={String(y.id) as "38" | "52"}
                selected={yearWeeks === y.id}
                onClick={(v) => setYearWeeks(Number(v) as YearWeeks)}
                small
              >
                {y.label}
              </Chip>
            ))}
          </div>
        </div>

        {/* Funding */}
        <div>
          <p className="mb-2 text-[0.62rem] font-bold uppercase tracking-[0.18em] text-[var(--muted)]">Funding</p>
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

        {/* Result */}
        <div className="flex flex-col gap-2 rounded-[1.25rem] bg-[rgba(127,216,210,0.12)] px-4 py-3.5 ring-1 ring-[rgba(127,216,210,0.25)]">
          <div className="flex items-baseline justify-between gap-4">
            <div>
              <p className="text-[0.62rem] font-bold uppercase tracking-[0.15em] text-[var(--muted)]">Weekly</p>
              <p className="font-heading text-[2rem] leading-none text-[var(--ink)]">{fmt(weekly)}</p>
            </div>
            <div className="text-right">
              <p className="text-[0.62rem] font-bold uppercase tracking-[0.15em] text-[var(--muted)]">Monthly est.</p>
              <p className="font-heading text-[1.35rem] leading-none text-[#3aada9]">{fmt(monthly)}</p>
            </div>
          </div>
          {/*
            Notes footer — both rows are always rendered so the card's
            height never changes when Early Bird or a discount is toggled.
            Inactive rows use `invisible` (paint hidden, layout preserved)
            instead of unmounting, which would cause a vertical shift in
            the surrounding hero pane.
          */}
          <div className="flex flex-col gap-1 border-t border-[rgba(127,216,210,0.25)] pt-2">
            <p
              className={`text-[0.65rem] text-[#3aada9] ${earlyBird ? "" : "invisible"}`}
              aria-hidden={!earlyBird}
            >
              Includes early bird (£{getBranchData(branch).earlyBird}/day × {days} day{days !== 1 ? "s" : ""})
            </p>
            <p
              className={`text-[0.65rem] text-[#3aada9] ${discountAmount > 0 ? "" : "invisible"}`}
              aria-hidden={discountAmount <= 0}
            >
              {DISCOUNTS.find((d) => d.id === discount)!.label} applied (saving {fmt(discountAmount)}/wk)
            </p>
            <p
              className={`text-[0.65rem] text-[#3aada9] ${fundingOffset > 0 ? "" : "invisible"}`}
              aria-hidden={fundingOffset <= 0}
            >
              Funded hours saving {fmt(fundingOffset)}/wk · estimated only
            </p>
          </div>
        </div>

        {/* CTA */}
        <Link
          href={
            `/contact?enquiry=fee-enquiry` +
            `&q_branch=${branch}&q_age=${encodeURIComponent(safeAgeGroup)}` +
            `&q_session=${session}&q_days=${days}&q_eb=${earlyBird}` +
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
