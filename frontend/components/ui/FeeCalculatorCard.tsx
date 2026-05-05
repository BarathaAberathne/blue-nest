"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Baby, GraduationCap, Users } from "lucide-react";
import feeData from "@/lib/fee-data.json";

// ── Types ─────────────────────────────────────────────────────────────────────

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
  { id: "0-2", label: "0–2 yrs", icon: Baby },
  { id: "2-3", label: "2–3 yrs", icon: Users },
  { id: "3-5", label: "3–5 yrs", icon: GraduationCap },
];

const SESSIONS: { id: SessionId; label: string; note: string }[] = [
  { id: "full_day",  label: "Full Day",   note: "7:30–18:00" },
  { id: "morning",   label: "Morning",    note: "7:30–13:00" },
  { id: "afternoon", label: "Afternoon",  note: "13:00–18:00" },
  { id: "school",    label: "School Day", note: "8:30–15:30" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function getBranchData(branch: BranchProp) {
  return feeData.branches[BRANCH_JSON_KEY[branch]];
}

function getAvailableAgeGroups(branch: BranchProp): AgeGroupId[] {
  const groups = getBranchData(branch).ageGroups;
  return AGE_GROUPS.map((g) => g.id).filter((id) => id in groups);
}

function calcWeekly(
  branch: BranchProp,
  ageGroup: AgeGroupId,
  session: SessionId,
  days: number,
  earlyBird: boolean,
): number {
  const branchData = getBranchData(branch);
  const ageGroupData = branchData.ageGroups[ageGroup as keyof typeof branchData.ageGroups];
  if (!ageGroupData) return 0;

  const rates = ageGroupData[session];
  const base = days === 5 ? rates.weekly : rates.daily * days;
  const earlyBirdCost = earlyBird ? branchData.earlyBird * days : 0;
  return base + earlyBirdCost;
}

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

  // Guard: if branch doesn't have the selected age group, pick first available
  const available = getAvailableAgeGroups(branch);
  const safeAgeGroup: AgeGroupId = available.includes(ageGroup) ? ageGroup : available[0];

  function handleBranchChange(b: BranchProp) {
    setBranch(b);
    const avail = getAvailableAgeGroups(b);
    if (!avail.includes(ageGroup)) setAgeGroup(avail[0]);
  }

  const weekly  = calcWeekly(branch, safeAgeGroup, session, days, earlyBird);
  const monthly = weekly * 4.33;

  const AgeIcon = AGE_GROUPS.find((g) => g.id === safeAgeGroup)!.icon;

  return (
    <div
      className={`w-full overflow-hidden rounded-[2rem] bg-[rgba(255,253,249,0.97)] shadow-[0_16px_50px_rgba(90,74,66,0.14)] ring-2 ring-[rgba(127,216,210,0.35)] backdrop-blur-sm ${compact ? "" : "max-w-[26rem]"}`}
    >
      {/* ── Header ────────────────────────────────────────────── */}
      <div
        className="px-5 py-4"
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
      <div className="space-y-4 px-5 py-5">

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
          <div className="mt-1 flex justify-between text-[0.6rem] text-[var(--muted)]">
            {[1, 2, 3, 4, 5].map((d) => <span key={d}>{d}d</span>)}
          </div>
        </div>

        {/* Early bird toggle */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[0.62rem] font-bold uppercase tracking-[0.18em] text-[var(--muted)]">Early bird</p>
            <p className="text-[0.6rem] text-[var(--muted)]">+£{getBranchData(branch).earlyBird}/day before 8:00 am</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={earlyBird}
            onClick={() => setEarlyBird((v) => !v)}
            className={`relative h-6 w-11 rounded-full transition-colors duration-200 ${
              earlyBird ? "bg-[#6ecfc9]" : "bg-[rgba(90,74,66,0.15)]"
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                earlyBird ? "translate-x-5" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>

        {/* Result */}
        <div className="rounded-[1.25rem] bg-[rgba(127,216,210,0.12)] px-4 py-3.5 ring-1 ring-[rgba(127,216,210,0.25)]">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[0.62rem] font-bold uppercase tracking-[0.15em] text-[var(--muted)]">Weekly</p>
              <p className="font-heading text-[2rem] leading-none text-[var(--ink)]">{fmt(weekly)}</p>
            </div>
            <div className="text-right">
              <p className="text-[0.62rem] font-bold uppercase tracking-[0.15em] text-[var(--muted)]">Monthly est.</p>
              <p className="font-heading text-[1.35rem] leading-none text-[#3aada9]">{fmt(monthly)}</p>
            </div>
          </div>
          {earlyBird && (
            <p className="mt-2 text-[0.65rem] text-[#3aada9]">
              Includes early bird (£{getBranchData(branch).earlyBird}/day × {days} day{days !== 1 ? "s" : ""})
            </p>
          )}
        </div>

        {/* CTA */}
        <Link
          href="/contact?enquiry=fee-enquiry"
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
