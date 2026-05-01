"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Baby, GraduationCap, Users } from "lucide-react";

// ── Data ──────────────────────────────────────────────────────────────────────

const AGE_BANDS = [
  { id: "infant",    label: "0–2 yrs", icon: Baby,           rateDay: 80, rateMorning: 42, rateAfternoon: 38, funding: [] as FundingId[] },
  { id: "toddler",   label: "2–3 yrs", icon: Users,          rateDay: 72, rateMorning: 38, rateAfternoon: 34, funding: ["15h"] as FundingId[] },
  { id: "preschool", label: "3–5 yrs", icon: GraduationCap,  rateDay: 65, rateMorning: 35, rateAfternoon: 30, funding: ["15h", "30h"] as FundingId[] },
] as const;

const SESSIONS = [
  { id: "day",       label: "Full Day",  hours: 10.5, note: "7:30–18:00" },
  { id: "morning",   label: "Morning",   hours: 5.5,  note: "7:30–13:00" },
  { id: "afternoon", label: "Afternoon", hours: 5,    note: "13:00–18:00" },
] as const;

type AgeBandId = typeof AGE_BANDS[number]["id"];
type SessionId  = typeof SESSIONS[number]["id"];
type FundingId  = "15h" | "30h";

const FUNDING_LABELS: Record<FundingId, string> = { "15h": "15 hrs/wk", "30h": "30 hrs/wk" };
const FUNDING_HRS:   Record<FundingId, number>  = { "15h": 15,          "30h": 30 };
const FUNDING_PER_HR = 5.62;

function getDailyRate(band: typeof AGE_BANDS[number], session: SessionId): number {
  if (session === "day")       return band.rateDay;
  if (session === "morning")   return band.rateMorning;
  return band.rateAfternoon;
}

function fmt(n: number) { return `£${n.toFixed(0)}`; }

// ── Sub-components ────────────────────────────────────────────────────────────

function Chip<T extends string>({
  value, selected, onClick, children,
}: { value: T; selected: boolean; onClick: (v: T) => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={() => onClick(value)}
      className={`rounded-full px-3 py-1.5 text-xs font-bold transition-all duration-200 ${
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

export default function FeeCalculatorCard({ compact = false }: { compact?: boolean }) {
  const [ageBandId, setAgeBandId] = useState<AgeBandId>("toddler");
  const [sessionId, setSessionId] = useState<SessionId>("day");
  const [days, setDays]           = useState(5);
  const [fundingId, setFundingId] = useState<FundingId | "none">("none");

  const band    = AGE_BANDS.find((b) => b.id === ageBandId)!;
  const session = SESSIONS.find((s) => s.id === sessionId)!;

  const activeFunding   = band.funding.includes(fundingId as FundingId) ? fundingId as FundingId : null;
  const weeklyHours     = days * session.hours;
  const grossWeekly     = days * getDailyRate(band, sessionId);
  const fundingOffset   = activeFunding ? Math.min(FUNDING_HRS[activeFunding], weeklyHours) * FUNDING_PER_HR : 0;
  const netWeekly       = Math.max(0, grossWeekly - fundingOffset);
  const netMonthly      = netWeekly * 4.33;

  const BandIcon = band.icon;

  return (
    <div
      className={`w-full overflow-hidden rounded-[2rem] bg-[rgba(255,253,249,0.97)] shadow-[0_16px_50px_rgba(90,74,66,0.14)] ring-2 ring-[rgba(127,216,210,0.35)] backdrop-blur-sm ${compact ? "" : "max-w-[26rem]"}`}
    >
      {/* ── Teal header ───────────────────────────────────────── */}
      <div
        className="px-5 py-4"
        style={{
          background: "linear-gradient(135deg, #8ee2dc 0%, #60c9c3 60%, #54b9b3 100%)",
        }}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/25">
            <BandIcon className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="font-heading text-[1.45rem] leading-none text-white">Estimate Your Fees</p>
            <p className="mt-0.5 text-[0.72rem] text-white/85">
              Indicative costs · government funding applied automatically
            </p>
          </div>
        </div>
      </div>

      {/* ── Controls ─────────────────────────────────────────── */}
      <div className="space-y-4 px-5 py-5">

        {/* Age band */}
        <div>
          <p className="mb-2 text-[0.62rem] font-bold uppercase tracking-[0.18em] text-[var(--muted)]">Child&apos;s age</p>
          <div className="flex flex-wrap gap-2">
            {AGE_BANDS.map((b) => {
              const Icon = b.icon;
              return (
                <Chip key={b.id} value={b.id} selected={ageBandId === b.id} onClick={setAgeBandId}>
                  <span className="flex items-center gap-1.5">
                    <Icon className="h-3 w-3" />
                    {b.label}
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
              <Chip key={s.id} value={s.id} selected={sessionId === s.id} onClick={setSessionId}>
                {s.label}
                <span className="ml-1 opacity-65 font-normal">{s.note}</span>
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

        {/* Government funding — only show if age band supports it */}
        {band.funding.length > 0 && (
          <div>
            <p className="mb-2 text-[0.62rem] font-bold uppercase tracking-[0.18em] text-[var(--muted)]">
              Gov. funding
            </p>
            <div className="flex flex-wrap gap-2">
              <Chip value={"none"} selected={!activeFunding} onClick={() => setFundingId("none")}>
                None
              </Chip>
              {band.funding.map((fid) => (
                <Chip key={fid} value={fid} selected={activeFunding === fid} onClick={setFundingId}>
                  {FUNDING_LABELS[fid]}
                </Chip>
              ))}
            </div>
          </div>
        )}

        {/* ── Result box ──────────────────────────────────────── */}
        <div className="rounded-[1.25rem] bg-[rgba(127,216,210,0.12)] px-4 py-3.5 ring-1 ring-[rgba(127,216,210,0.25)]">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[0.62rem] font-bold uppercase tracking-[0.15em] text-[var(--muted)]">Weekly</p>
              <p className="font-heading text-[2rem] leading-none text-[var(--ink)]">{fmt(netWeekly)}</p>
            </div>
            <div className="text-right">
              <p className="text-[0.62rem] font-bold uppercase tracking-[0.15em] text-[var(--muted)]">Monthly est.</p>
              <p className="font-heading text-[1.35rem] leading-none text-[#3aada9]">{fmt(netMonthly)}</p>
            </div>
          </div>
          {activeFunding && (
            <p className="mt-2 text-[0.65rem] text-[#3aada9]">
              Saving {fmt(fundingOffset)}/wk with {FUNDING_LABELS[activeFunding]} funding
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
          * Indicative only. Actual fees vary by branch &amp; session.
        </p>
      </div>
    </div>
  );
}
