"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Calculator, Info } from "lucide-react";
import { Reveal } from "@/components/ui/Motion";

// ── Data ──────────────────────────────────────────────────────────────────────

const AGE_BANDS = [
  {
    id:          "infant",
    label:       "0–2 years",
    sub:         "Babies & young toddlers",
    rateDay:     80,
    rateMorning: 42,
    rateAfternoon: 38,
    fundingOptions: ["none"] as FundingId[],
  },
  {
    id:          "toddler",
    label:       "2–3 years",
    sub:         "Toddlers",
    rateDay:     72,
    rateMorning: 38,
    rateAfternoon: 34,
    fundingOptions: ["none", "15h"] as FundingId[],
  },
  {
    id:          "preschool",
    label:       "3–5 years",
    sub:         "Pre-school",
    rateDay:     65,
    rateMorning: 35,
    rateAfternoon: 30,
    fundingOptions: ["none", "15h", "30h"] as FundingId[],
  },
] as const;

const SESSIONS = [
  { id: "day",       label: "Full Day",  hours: 10.5, description: "7:30 am – 6:00 pm" },
  { id: "morning",   label: "Morning",   hours: 5.5,  description: "7:30 am – 1:00 pm"  },
  { id: "afternoon", label: "Afternoon", hours: 5,    description: "1:00 pm – 6:00 pm"  },
] as const;

type AgeBandId  = typeof AGE_BANDS[number]["id"];
type SessionId  = typeof SESSIONS[number]["id"];
type FundingId  = "none" | "15h" | "30h";

const FUNDING_LABELS: Record<FundingId, string> = {
  none: "No government funding",
  "15h": "15 hrs/week (universal)",
  "30h": "30 hrs/week (working parents)",
};

// Gov funding hourly rate (England average — used to offset costs)
const FUNDING_PER_HR = 5.62;
const FUNDING_HRS: Record<FundingId, number> = { none: 0, "15h": 15, "30h": 30 };

// ── Helpers ───────────────────────────────────────────────────────────────────

function getDailyRate(band: typeof AGE_BANDS[number], session: SessionId): number {
  if (session === "day")       return band.rateDay;
  if (session === "morning")   return band.rateMorning;
  return band.rateAfternoon;
}

function fmt(pence: number) {
  return `£${pence.toFixed(2)}`;
}

// ── Selector button ───────────────────────────────────────────────────────────

function Chip<T extends string>({
  value, selected, onClick, children,
}: { value: T; selected: boolean; onClick: (v: T) => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={() => onClick(value)}
      className={`rounded-full px-4 py-2 text-sm font-semibold transition-all duration-200 ${
        selected
          ? "bg-[#7fd8d2] text-white shadow-[0_4px_14px_rgba(127,216,210,0.35)]"
          : "bg-[rgba(127,216,210,0.12)] text-[var(--ink)] hover:bg-[rgba(127,216,210,0.22)]"
      }`}
    >
      {children}
    </button>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function FeeCalculatorSection() {
  const [ageBandId, setAgeBandId]  = useState<AgeBandId>("toddler");
  const [sessionId, setSessionId]  = useState<SessionId>("day");
  const [days, setDays]            = useState(5);
  const [fundingId, setFundingId]  = useState<FundingId>("none");

  const band    = AGE_BANDS.find((b) => b.id === ageBandId)!;
  const session = SESSIONS.find((s) => s.id === sessionId)!;

  // If current funding not available for this band, reset
  const availableFunding = band.fundingOptions;
  const activeFunding    = availableFunding.includes(fundingId) ? fundingId : "none";

  // Weekly session hours (days attended × session length)
  const weeklySessionHours = days * session.hours;

  // Gross weekly cost (before funding)
  const grossWeekly = days * getDailyRate(band, sessionId);

  // Funding offset — capped at weekly session hours
  const fundingHrsPerWeek = Math.min(FUNDING_HRS[activeFunding], weeklySessionHours);
  const fundingOffset     = fundingHrsPerWeek * FUNDING_PER_HR;

  // Net weekly after funding
  const netWeekly  = Math.max(0, grossWeekly - fundingOffset);
  const netMonthly = netWeekly * 4.33;

  return (
    <section className="relative overflow-hidden px-4 py-16 sm:px-6 lg:px-8 lg:py-24">

      {/* Soft background tint */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 80% 20%, rgba(127,216,210,0.10) 0%, transparent 55%), " +
            "radial-gradient(ellipse at 15% 85%, rgba(246,213,223,0.14) 0%, transparent 50%)",
        }}
        aria-hidden="true"
      />

      <div className="container-site relative z-10">
        <Reveal>
          <div className="mb-12 text-center">
            <span className="section-kicker">Transparent pricing</span>
            <h2 className="section-title mt-4">Estimate your fees</h2>
            <p className="section-subtitle mx-auto max-w-2xl">
              Use the calculator below to get an indicative weekly and monthly cost. Government
              funding is automatically applied where eligible.
            </p>
          </div>
        </Reveal>

        <Reveal delay={0.08}>
          <div className="mx-auto max-w-3xl rounded-[2.5rem] bg-[var(--soft-white)] shadow-[0_16px_50px_rgba(90,74,66,0.10)] ring-1 ring-[rgba(90,74,66,0.06)] px-6 py-8 sm:px-10 sm:py-10">

            {/* ── Age band ───────────────────────────────────────── */}
            <fieldset className="mb-7">
              <legend className="mb-3 text-[0.65rem] font-bold uppercase tracking-[0.18em] text-[var(--muted)]">
                Child&apos;s age
              </legend>
              <div className="flex flex-wrap gap-2.5">
                {AGE_BANDS.map((b) => (
                  <Chip key={b.id} value={b.id} selected={ageBandId === b.id} onClick={setAgeBandId}>
                    {b.label}
                  </Chip>
                ))}
              </div>
              <p className="mt-2 text-xs text-[var(--muted)]">{band.sub}</p>
            </fieldset>

            {/* ── Session type ───────────────────────────────────── */}
            <fieldset className="mb-7">
              <legend className="mb-3 text-[0.65rem] font-bold uppercase tracking-[0.18em] text-[var(--muted)]">
                Session type
              </legend>
              <div className="flex flex-wrap gap-2.5">
                {SESSIONS.map((s) => (
                  <Chip key={s.id} value={s.id} selected={sessionId === s.id} onClick={setSessionId}>
                    {s.label}
                    <span className="ml-1.5 text-[0.7rem] opacity-70">{s.description}</span>
                  </Chip>
                ))}
              </div>
            </fieldset>

            {/* ── Days per week ─────────────────────────────────── */}
            <div className="mb-7">
              <label
                htmlFor="days-slider"
                className="mb-3 block text-[0.65rem] font-bold uppercase tracking-[0.18em] text-[var(--muted)]"
              >
                Days per week — <span className="font-extrabold text-[var(--ink)]">{days} day{days !== 1 ? "s" : ""}</span>
              </label>
              <input
                id="days-slider"
                type="range"
                min={1}
                max={5}
                step={1}
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                className="w-full accent-[#7fd8d2]"
              />
              <div className="mt-1 flex justify-between text-[0.65rem] text-[var(--muted)]">
                {[1, 2, 3, 4, 5].map((d) => (
                  <span key={d}>{d}d</span>
                ))}
              </div>
            </div>

            {/* ── Government funding ────────────────────────────── */}
            {availableFunding.length > 1 && (
              <fieldset className="mb-8">
                <legend className="mb-3 flex items-center gap-1.5 text-[0.65rem] font-bold uppercase tracking-[0.18em] text-[var(--muted)]">
                  Government funding
                  <Info className="h-3 w-3 opacity-60" aria-hidden="true" />
                </legend>
                <div className="flex flex-wrap gap-2.5">
                  {availableFunding.map((fid) => (
                    <Chip key={fid} value={fid} selected={activeFunding === fid} onClick={setFundingId}>
                      {FUNDING_LABELS[fid]}
                    </Chip>
                  ))}
                </div>
              </fieldset>
            )}

            {/* ── Cost breakdown ────────────────────────────────── */}
            <div className="rounded-[1.5rem] bg-[rgba(127,216,210,0.08)] px-6 py-5 ring-1 ring-[rgba(127,216,210,0.20)]">
              <div className="space-y-2.5 text-sm">
                <div className="flex justify-between text-[var(--muted)]">
                  <span>Gross weekly ({days} day{days !== 1 ? "s" : ""} × {fmt(getDailyRate(band, sessionId))})</span>
                  <span className="font-semibold text-[var(--ink)]">{fmt(grossWeekly)}</span>
                </div>
                {activeFunding !== "none" && (
                  <div className="flex justify-between text-[#3aada9]">
                    <span>Government funding ({FUNDING_HRS[activeFunding]}h/wk × £{FUNDING_PER_HR})</span>
                    <span className="font-semibold">– {fmt(fundingOffset)}</span>
                  </div>
                )}
                <div className="border-t border-[rgba(90,74,66,0.08)] pt-3 flex justify-between">
                  <span className="font-bold text-[var(--ink)]">Net weekly estimate</span>
                  <span className="font-extrabold text-[var(--ink)] text-[1.1rem]">{fmt(netWeekly)}</span>
                </div>
                <div className="flex justify-between text-[var(--muted)]">
                  <span>Monthly estimate (×4.33)</span>
                  <span className="font-semibold text-[var(--ink)]">{fmt(netMonthly)}</span>
                </div>
              </div>
            </div>

            {/* ── Disclaimer + CTA ──────────────────────────────── */}
            <p className="mt-5 text-[0.72rem] leading-relaxed text-[var(--muted)]">
              * Fees shown are indicative. Actual costs depend on your chosen branch, any sibling
              discounts, and your council&apos;s funded hours rate. Contact us for a personalised quote.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/contact"
                className="btn-primary inline-flex items-center gap-2"
              >
                Get a personalised quote
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/admission/our-fees"
                className="btn-secondary inline-flex items-center gap-2"
              >
                <Calculator className="h-4 w-4" />
                View full fee schedule
              </Link>
            </div>

          </div>
        </Reveal>
      </div>
    </section>
  );
}
