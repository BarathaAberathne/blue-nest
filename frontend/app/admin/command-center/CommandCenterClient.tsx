"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  Baby,
  BarChart3,
  Bell,
  BookOpen,
  Building2,
  CalendarCheck,
  CalendarDays,
  CalendarPlus,
  Check,
  ChevronRight,
  ClipboardList,
  FileBarChart,
  FileText,
  Home,
  Mail,
  Menu,
  MessagesSquare,
  MessageSquareText,
  Mic,
  PoundSterling,
  Search,
  Send,
  Settings,
  Star,
  UserPlus,
  Users,
} from "lucide-react";

import "./command-center.css";
import {
  ATTENDANCE,
  BRANCHES,
  CONVERSION_PCT,
  EVENTS,
  FINANCE,
  FUNNEL,
  KPIS,
  NAV_ITEMS,
  NOTIFICATIONS,
  OBJECTIVES,
  QUICK_ACTIONS,
  SENTIMENT,
  SYSTEM_HEALTH,
  type Branch,
  type Kpi,
} from "./data";
import {
  AttendanceBars,
  Building,
  CentrepieceRings,
  DonutChart,
  Funnel,
  Radar,
  RingGauge,
  SentimentLine,
  Stars,
} from "./widgets";

const LOGO = "/logo/bluenest-logo.png";

const NAV_ICONS: Record<string, typeof Home> = {
  Dashboard: Home,
  Branches: Building2,
  Children: Baby,
  Staff: Users,
  Enquiries: MessageSquareText,
  Admissions: ClipboardList,
  Finance: PoundSterling,
  Attendance: CalendarCheck,
  Curriculum: BookOpen,
  Communication: MessagesSquare,
  Events: CalendarDays,
  Reports: BarChart3,
  Documents: FileText,
  Settings,
};

const QA_ICONS = [Search, ClipboardList, Send, CalendarCheck, CalendarPlus];

/* ── Small building blocks ─────────────────────────────────────────────── */

function Panel({
  children,
  className = "",
  clip = false,
}: {
  children: React.ReactNode;
  className?: string;
  clip?: boolean;
}) {
  return (
    <div className={`cc-panel ${clip ? "cc-panel--clip" : ""} ${className}`}>
      <span className="cc-bracket tl" />
      <span className="cc-bracket tr" />
      <span className="cc-bracket bl" />
      <span className="cc-bracket br" />
      <div className="cc-scan" />
      <div className="relative" style={{ height: "100%" }}>
        {children}
      </div>
    </div>
  );
}

function SectionTitle({ children, sub }: { children: React.ReactNode; sub?: string }) {
  return (
    <div className="flex items-baseline justify-between">
      <p className="cc-heading" style={{ fontSize: 12 }}>
        {children}
      </p>
      {sub && (
        <span className="cc-label" style={{ fontSize: 9, color: "var(--cc-muted)" }}>
          {sub}
        </span>
      )}
    </div>
  );
}

/* ── Clock ─────────────────────────────────────────────────────────────── */

function useClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function TopClock() {
  const now = useClock();
  const weekday = now?.toLocaleDateString("en-GB", { weekday: "long" }).toUpperCase() ?? "";
  const date =
    now
      ?.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
      .toUpperCase() ?? "";
  const time = now?.toLocaleTimeString("en-GB", { hour12: true, hour: "2-digit", minute: "2-digit", second: "2-digit" }).toUpperCase() ?? "--:--:--";
  return (
    <div suppressHydrationWarning>
      <p className="cc-label" style={{ fontSize: 11, color: "var(--cc-accent)", letterSpacing: "0.18em" }}>
        {weekday}
      </p>
      <p className="cc-label" style={{ fontSize: 11, color: "var(--cc-muted)", marginTop: 2 }}>
        {date}
      </p>
      <p className="cc-heading" style={{ fontSize: 20, color: "var(--cc-text)", marginTop: 4, letterSpacing: "0.04em" }}>
        {time}
      </p>
      <p className="cc-label" style={{ fontSize: 8.5, color: "var(--cc-muted-dim)", marginTop: 1 }}>
        LOCAL TIME
      </p>
    </div>
  );
}

/* ── KPI card ──────────────────────────────────────────────────────────── */

function KpiCard({ kpi }: { kpi: Kpi }) {
  const Icon =
    kpi.kind === "children" ? Baby : kpi.kind === "staff" ? Users : MessageSquareText;
  return (
    <Panel className="px-4 py-3" clip>
      <div className="flex items-center gap-3" style={{ height: 62 }}>
        {kpi.kind === "occupancy" ? (
          <RingGauge value={92} size={58} color="var(--cc-accent)" track="rgba(214,179,106,0.15)" />
        ) : kpi.kind === "satisfaction" ? (
          <div
            className="flex items-center justify-center shrink-0"
            style={{
              width: 52,
              height: 52,
              borderRadius: "50%",
              border: "1.5px solid rgba(214,179,106,0.5)",
              boxShadow: "0 0 14px rgba(214,179,106,0.2) inset",
            }}
          >
            <Star size={22} color="var(--cc-accent)" fill="var(--cc-accent)" />
          </div>
        ) : (
          <div
            className="flex items-center justify-center shrink-0"
            style={{
              width: 46,
              height: 46,
              borderRadius: 10,
              background: "rgba(15,125,255,0.1)",
              border: "1px solid rgba(90,160,235,0.3)",
            }}
          >
            <Icon size={24} color="var(--cc-primary-soft)" />
          </div>
        )}
        <div className="min-w-0">
          <p className="cc-label" style={{ fontSize: 8.5, color: "var(--cc-muted)" }}>
            {kpi.label}
          </p>
          <p className="cc-heading" style={{ fontSize: 26, lineHeight: 1.1, color: "var(--cc-text)", letterSpacing: "0.01em" }}>
            {kpi.value}
            {kpi.kind === "satisfaction" && (
              <span style={{ fontSize: 12, color: "var(--cc-muted)" }}> / 5</span>
            )}
          </p>
          <p style={{ fontSize: 9.5, color: kpi.sub.startsWith("+") ? "var(--cc-success)" : "var(--cc-muted-dim)", marginTop: 1 }}>
            {kpi.sub}
          </p>
        </div>
      </div>
    </Panel>
  );
}

/* ── Branch card ───────────────────────────────────────────────────────── */

function BranchCard({ branch }: { branch: Branch }) {
  return (
    <Panel className="px-3 py-2.5" clip>
      <div className="flex items-center gap-2 mb-1.5">
        <span className="cc-dot" style={{ color: "var(--cc-success)" }} />
        <p className="cc-heading" style={{ fontSize: 12, color: "var(--cc-accent)" }}>
          {branch.name.toUpperCase()}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <Building slug={branch.slug} />
        <div>
          <p style={{ fontSize: 15, color: "var(--cc-text)", fontWeight: 700 }}>
            {branch.children}{" "}
            <span style={{ fontSize: 10, color: "var(--cc-muted)", fontWeight: 400 }}>Children</span>
          </p>
          <p style={{ fontSize: 15, color: "var(--cc-primary-soft)", fontWeight: 700, marginTop: 1 }}>
            {branch.occupancy}%{" "}
            <span style={{ fontSize: 10, color: "var(--cc-muted)", fontWeight: 400 }}>Occupancy</span>
          </p>
          <button className="cc-linkbtn" style={{ marginTop: 4 }}>
            View Details <ChevronRight size={11} />
          </button>
        </div>
      </div>
    </Panel>
  );
}

/* ── Main composition ──────────────────────────────────────────────────── */

export default function CommandCenterClient() {
  const byCorner = (c: Branch["corner"]) => BRANCHES.find((b) => b.corner === c)!;

  return (
    <div className="cc-root">
      <div className="cc-stage">
        {/* ══ Top bar ══════════════════════════════════════════════════ */}
        <header className="flex items-start justify-between gap-6 mb-3">
          <div style={{ width: 230 }}>
            <TopClock />
          </div>

          <div className="flex-1 flex flex-col items-center pt-1">
            <div className="flex items-center gap-4">
              <Image src={LOGO} alt="Blue Nest" width={72} height={40} className="cc-logo-glow" style={{ height: 40, width: "auto" }} priority />
              <div className="text-center">
                <h1 className="cc-serif" style={{ fontSize: 34, letterSpacing: "0.06em", color: "var(--cc-accent)", lineHeight: 1, textShadow: "0 0 22px rgba(214,179,106,0.35)" }}>
                  BLUE NEST MONTESSORI SCHOOL
                </h1>
                <p className="cc-label" style={{ fontSize: 12, color: "var(--cc-primary-soft)", letterSpacing: "0.42em", marginTop: 6 }}>
                  LEAD&nbsp;&nbsp;•&nbsp;&nbsp;INSPIRE&nbsp;&nbsp;•&nbsp;&nbsp;GROW
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2" style={{ width: 230, justifyContent: "flex-end" }}>
            <button className="cc-pill"><Bell size={14} /> 5</button>
            <button className="cc-pill"><Mail size={14} /> 3</button>
            <button className="cc-pill" style={{ padding: 8 }}><Settings size={14} /></button>
            <button className="cc-pill" style={{ padding: 8 }}><Menu size={14} /></button>
          </div>
        </header>

        {/* sub-header */}
        <div className="flex justify-center mb-3">
          <p className="cc-label" style={{ fontSize: 10.5, color: "var(--cc-primary-soft)", letterSpacing: "0.24em" }}>
            <span style={{ color: "var(--cc-accent)" }}>◈</span> MD COMMAND CENTER
            <span style={{ color: "var(--cc-muted-dim)", margin: "0 10px" }}>•</span>
            CENTRAL MANAGEMENT SYSTEM
          </p>
        </div>

        {/* ══ Body: sidebar | main | right ══════════════════════════════ */}
        <div className="flex gap-3 items-stretch">
          {/* ── Sidebar ─────────────────────────────────────────── */}
          <aside style={{ width: 230 }} className="shrink-0 flex flex-col gap-3">
            <Panel className="px-4 py-4" clip>
              <p className="cc-label text-center" style={{ fontSize: 9, color: "var(--cc-muted)", letterSpacing: "0.2em" }}>
                MD PROFILE
              </p>
              <div className="flex justify-center my-3">
                <div style={{ position: "relative", width: 92, height: 92 }}>
                  <div className="cc-spin-slow" style={{ position: "absolute", inset: -6, borderRadius: "50%", border: "1px dashed rgba(214,179,106,0.5)" }} />
                  <div
                    style={{
                      width: 92,
                      height: 92,
                      borderRadius: "50%",
                      border: "2px solid var(--cc-accent)",
                      background: "radial-gradient(circle at 50% 30%, #24476f, #0c1c33)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: "0 0 24px rgba(214,179,106,0.35), inset 0 0 18px rgba(15,125,255,0.25)",
                      color: "var(--cc-accent)",
                      fontFamily: "var(--font-admin-heading)",
                      fontSize: 26,
                      fontWeight: 700,
                    }}
                  >
                    MD
                  </div>
                </div>
              </div>
              <p className="cc-heading text-center" style={{ fontSize: 12, color: "var(--cc-text)" }}>
                MAHESH DEVINDE RATNAYAKE
              </p>
              <p className="cc-label text-center" style={{ fontSize: 8.5, color: "var(--cc-accent)", marginTop: 3 }}>
                GROUP MANAGING DIRECTOR
              </p>
              <div className="flex items-center justify-center gap-1.5 mt-2">
                <span className="cc-dot" style={{ color: "var(--cc-success)", width: 6, height: 6 }} />
                <span className="cc-label" style={{ fontSize: 9, color: "var(--cc-success)" }}>ONLINE</span>
              </div>
            </Panel>

            <Panel className="px-2.5 py-2.5 flex-1" clip>
              <nav className="flex flex-col gap-0.5">
                {NAV_ITEMS.map((item) => {
                  const Icon = NAV_ICONS[item] ?? Home;
                  const active = item === "Dashboard";
                  return (
                    <button key={item} className={`cc-nav-item ${active ? "cc-nav-item--active" : ""}`}>
                      <Icon size={15} />
                      <span className="flex-1 text-left">{item}</span>
                      {active && <ChevronRight size={13} />}
                    </button>
                  );
                })}
              </nav>
            </Panel>

            <Panel className="px-4 py-3" clip>
              <p className="cc-label" style={{ fontSize: 9, color: "var(--cc-muted)", letterSpacing: "0.16em" }}>
                SYSTEM STATUS
              </p>
              <div className="flex items-center gap-3 mt-2">
                <Radar size={64} color="#1ed760" />
                <div>
                  <p className="cc-label" style={{ fontSize: 9, color: "var(--cc-success)", lineHeight: 1.4 }}>
                    ALL SYSTEMS<br />OPERATIONAL
                  </p>
                  <p className="cc-heading" style={{ fontSize: 20, color: "var(--cc-success)", marginTop: 2 }}>
                    100%
                  </p>
                </div>
              </div>
              <p style={{ fontSize: 9, color: "var(--cc-muted-dim)", marginTop: 8 }}>Last sync: 11:42 AM</p>
            </Panel>
          </aside>

          {/* ── Main workspace ──────────────────────────────────── */}
          <main className="flex-1 flex flex-col gap-3 min-w-0">
            {/* KPI row */}
            <div className="grid grid-cols-5 gap-3">
              {KPIS.map((k) => (
                <KpiCard key={k.key} kpi={k} />
              ))}
            </div>

            {/* Branch overview centrepiece */}
            <Panel className="px-4 py-3" clip>
              <p className="cc-heading text-center" style={{ fontSize: 15, color: "var(--cc-text)", letterSpacing: "0.2em", marginBottom: 4 }}>
                BRANCH OVERVIEW
              </p>
              <div style={{ position: "relative", height: 300 }}>
                {/* Connector lines fanning from the centrepiece to each branch card */}
                <svg
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                  aria-hidden
                  style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
                >
                  <defs>
                    <linearGradient id="cc-link" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="rgba(15,125,255,0.55)" />
                      <stop offset="100%" stopColor="rgba(214,179,106,0.5)" />
                    </linearGradient>
                  </defs>
                  {[
                    [31, 24],
                    [69, 24],
                    [31, 60],
                    [69, 60],
                    [50, 90],
                  ].map(([x, y]) => (
                    <line
                      key={`${x}-${y}`}
                      x1={50}
                      y1={49}
                      x2={x}
                      y2={y}
                      stroke="url(#cc-link)"
                      strokeWidth={1}
                      strokeDasharray="3 4"
                      vectorEffect="non-scaling-stroke"
                      opacity={0.55}
                    />
                  ))}
                </svg>
                {/* Centrepiece */}
                <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)", width: 300, height: 300 }}>
                  <CentrepieceRings size={300} />
                  <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                    <Image src={LOGO} alt="Blue Nest" width={120} height={66} className="cc-logo-glow" style={{ width: 120, height: "auto" }} />
                    <p className="cc-serif" style={{ fontSize: 22, letterSpacing: "0.22em", color: "var(--cc-primary-soft)", marginTop: 6, textShadow: "0 0 16px rgba(15,125,255,0.6)" }}>
                      BLUE NEST
                    </p>
                    <p className="cc-label" style={{ fontSize: 8, letterSpacing: "0.3em", color: "var(--cc-muted)", marginTop: 2 }}>
                      MONTESSORI SCHOOL
                    </p>
                  </div>
                </div>

                {/* Branch cards positioned around */}
                <div style={{ position: "absolute", left: 0, top: 0, width: 300 }}>
                  <BranchCard branch={byCorner("top-left")} />
                </div>
                <div style={{ position: "absolute", right: 0, top: 0, width: 300 }}>
                  <BranchCard branch={byCorner("top-right")} />
                </div>
                <div style={{ position: "absolute", left: 0, top: 152, width: 300 }}>
                  <BranchCard branch={byCorner("mid-left")} />
                </div>
                <div style={{ position: "absolute", right: 0, top: 152, width: 300 }}>
                  <BranchCard branch={byCorner("mid-right")} />
                </div>
                <div style={{ position: "absolute", left: "50%", bottom: -6, transform: "translateX(-50%)", width: 300 }}>
                  <BranchCard branch={byCorner("bottom")} />
                </div>
              </div>
            </Panel>

            {/* Spacer pushes the bottom cluster down so the taller sidebar and the
                main column bottoms line up (no dead band under the workspace). */}
            <div className="flex-1" style={{ minHeight: 8 }} />

            {/* Bottom cluster: funnel | attendance | sentiment */}
            <div className="grid gap-3" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
              <Panel className="px-4 py-3" clip>
                <SectionTitle sub="This Month">ADMISSION PIPELINE</SectionTitle>
                <div className="mt-2">
                  <Funnel stages={FUNNEL} />
                </div>
                <div className="flex justify-end mt-1">
                  <div className="flex flex-col items-center">
                    <RingGauge value={CONVERSION_PCT} size={64} big={`${CONVERSION_PCT}%`} color="var(--cc-accent)" track="rgba(214,179,106,0.15)" />
                    <span className="cc-label" style={{ fontSize: 8, color: "var(--cc-muted)" }}>CONVERSION</span>
                  </div>
                </div>
              </Panel>

              <Panel className="px-4 py-3" clip>
                <SectionTitle sub="This Week">ATTENDANCE OVERVIEW</SectionTitle>
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex-1">
                    <AttendanceBars days={ATTENDANCE.days} />
                  </div>
                  <div className="flex flex-col items-center shrink-0">
                    <RingGauge value={ATTENDANCE.average} size={78} big={`${ATTENDANCE.average}%`} color="var(--cc-primary)" />
                    <span className="cc-label text-center" style={{ fontSize: 7.5, color: "var(--cc-muted)", lineHeight: 1.3, marginTop: 2 }}>
                      AVERAGE<br />ATTENDANCE
                    </span>
                  </div>
                </div>
              </Panel>

              <Panel className="px-4 py-3" clip>
                <SectionTitle sub="This Month">PARENT SENTIMENT</SectionTitle>
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex-1">
                    <SentimentLine points={SENTIMENT.points} />
                  </div>
                  <div className="text-center shrink-0" style={{ width: 74 }}>
                    <p className="cc-heading" style={{ fontSize: 24, color: "var(--cc-text)" }}>
                      {SENTIMENT.score}<span style={{ fontSize: 12, color: "var(--cc-muted)" }}> /5</span>
                    </p>
                    <p className="cc-label" style={{ fontSize: 7.5, color: "var(--cc-accent)" }}>EXCELLENT</p>
                    <div className="flex justify-center mt-1"><Stars size={11} /></div>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span style={{ fontSize: 16 }}>🙂</span>
                  <span style={{ fontSize: 10, color: "var(--cc-success)" }}>{SENTIMENT.delta}</span>
                </div>
              </Panel>
            </div>
          </main>

          {/* ── Right column ────────────────────────────────────── */}
          <aside style={{ width: 300 }} className="shrink-0 flex flex-col gap-3">
            <Panel className="px-4 py-3" clip>
              <SectionTitle sub="This Month">FINANCIAL OVERVIEW</SectionTitle>
              <div className="flex justify-center my-1" style={{ height: 190 }}>
                <DonutChart slices={FINANCE.slices} total={FINANCE.total} caption="TOTAL REVENUE" />
              </div>
              <p className="text-center" style={{ fontSize: 10, color: "var(--cc-success)", marginTop: -6 }}>
                {FINANCE.delta}
              </p>
              <div className="mt-3 flex flex-col gap-1.5">
                {FINANCE.slices.map((s) => (
                  <div key={s.label} className="flex items-center gap-2" style={{ fontSize: 10.5 }}>
                    <span style={{ width: 9, height: 9, borderRadius: 2, background: sliceColor(s.color) }} />
                    <span style={{ flex: 1, color: "var(--cc-muted)" }} className="cc-label">{s.label}</span>
                    <span style={{ color: "var(--cc-text)", fontWeight: 600 }}>{s.amount}</span>
                    <span style={{ color: "var(--cc-muted-dim)", width: 26, textAlign: "right" }}>{s.pct}%</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-center mt-3 pt-2" style={{ borderTop: "1px solid var(--cc-line)" }}>
                <button className="cc-linkbtn">View Full Financial Report <ChevronRight size={11} /></button>
              </div>
            </Panel>

            <Panel className="px-4 py-3" clip>
              <SectionTitle>UPCOMING EVENTS</SectionTitle>
              <div className="mt-2 flex flex-col gap-2">
                {EVENTS.map((e) => (
                  <div key={e.title} className="flex items-center gap-2.5">
                    <CalendarDays size={15} color="var(--cc-primary-soft)" />
                    <span style={{ flex: 1, fontSize: 11.5, color: "var(--cc-text)" }}>{e.title}</span>
                    <span className="cc-label" style={{ fontSize: 9, color: "var(--cc-accent)" }}>{e.month}</span>
                    <span className="cc-heading" style={{ fontSize: 15, color: "var(--cc-text)", width: 22, textAlign: "right" }}>{e.day}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-center mt-3 pt-2" style={{ borderTop: "1px solid var(--cc-line)" }}>
                <button className="cc-linkbtn">View All Events <ChevronRight size={11} /></button>
              </div>
            </Panel>

            <Panel className="px-4 py-3 flex-1" clip>
              <SectionTitle>NOTIFICATIONS</SectionTitle>
              <div className="mt-2 flex flex-col gap-2.5">
                {NOTIFICATIONS.map((n) => (
                  <div key={n.title} className="flex items-start gap-2.5">
                    <Mail size={14} color={n.severity === "warning" ? "var(--cc-warning)" : "var(--cc-primary-soft)"} style={{ marginTop: 2 }} />
                    <div className="flex-1 flex items-baseline justify-between gap-2">
                      <span style={{ fontSize: 11.5, color: "var(--cc-text)" }}>{n.title}</span>
                      <span style={{ fontSize: 9.5, color: "var(--cc-muted)", textAlign: "right" }}>{n.meta}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-center mt-3 pt-2" style={{ borderTop: "1px solid var(--cc-line)" }}>
                <button className="cc-linkbtn">View All Notifications <ChevronRight size={11} /></button>
              </div>
            </Panel>
          </aside>
        </div>

        {/* ══ Bottom bar ═══════════════════════════════════════════════ */}
        <div className="grid gap-3 mt-3" style={{ gridTemplateColumns: "1.1fr 1.2fr 1fr 1fr" }}>
          {/* Quick actions */}
          <Panel className="px-4 py-3" clip>
            <SectionTitle>QUICK ACTIONS</SectionTitle>
            <div className="grid grid-cols-5 gap-2 mt-2">
              {QUICK_ACTIONS.map((a, i) => {
                const Icon = QA_ICONS[i];
                return (
                  <button key={a} className="cc-action-btn">
                    <Icon size={17} color="var(--cc-primary-soft)" />
                    {a}
                  </button>
                );
              })}
            </div>
            <button className="cc-action-btn mt-2" style={{ flexDirection: "row", width: "100%", justifyContent: "center", gap: 8, fontSize: 11 }}>
              <FileBarChart size={15} color="var(--cc-accent)" /> GENERATE REPORT
            </button>
          </Panel>

          {/* Mission objectives */}
          <Panel className="px-4 py-3" clip>
            <SectionTitle>MISSION OBJECTIVES</SectionTitle>
            <div className="mt-2 flex flex-col gap-2.5">
              {OBJECTIVES.map((o) => (
                <div key={o.label}>
                  <div className="flex items-center gap-2">
                    <span style={{ width: 15, height: 15, borderRadius: 4, border: "1px solid var(--cc-success)", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(30,215,96,0.12)" }}>
                      <Check size={10} color="var(--cc-success)" />
                    </span>
                    <span style={{ flex: 1, fontSize: 11, color: "var(--cc-text)" }}>{o.label}</span>
                    <span className="cc-heading" style={{ fontSize: 11, color: "var(--cc-accent)" }}>{o.pct}%</span>
                  </div>
                  <div style={{ height: 5, borderRadius: 3, background: "rgba(64,130,210,0.15)", marginTop: 4, marginLeft: 23 }}>
                    <div style={{ width: `${o.pct}%`, height: "100%", borderRadius: 3, background: "linear-gradient(90deg, var(--cc-primary), var(--cc-success))", boxShadow: "0 0 8px rgba(30,215,96,0.4)" }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-center mt-2 pt-1.5">
              <button className="cc-linkbtn">View All Objectives <ChevronRight size={11} /></button>
            </div>
          </Panel>

          {/* AI assistant */}
          <Panel className="px-4 py-3" clip>
            <SectionTitle>AI ASSISTANT</SectionTitle>
            <div className="flex items-start gap-3 mt-2">
              <div
                className="shrink-0 flex items-center justify-center"
                style={{
                  width: 54,
                  height: 54,
                  borderRadius: "50%",
                  border: "1.5px solid var(--cc-accent)",
                  background: "radial-gradient(circle, rgba(15,125,255,0.25), transparent)",
                  boxShadow: "0 0 20px rgba(15,125,255,0.4)",
                  animation: "cc-pulse 3s ease-in-out infinite",
                  color: "var(--cc-accent)",
                  fontFamily: "var(--font-admin-heading)",
                  fontWeight: 700,
                  fontSize: 16,
                }}
              >
                AI
              </div>
              <p style={{ fontSize: 11, color: "var(--cc-muted)", lineHeight: 1.5 }}>
                <span style={{ color: "var(--cc-accent)" }}>Good morning MD,</span> Here&apos;s your overview for today. Would you like a detailed report on any area?
              </p>
            </div>
            <div className="flex items-center gap-2 mt-3">
              <div className="flex items-end gap-[3px]" style={{ height: 26, flex: 1 }}>
                {Array.from({ length: 34 }).map((_, i) => (
                  <span key={i} className="cc-wavebar" style={{ height: 24, animationDelay: `${(i % 10) * 0.09}s` }} />
                ))}
              </div>
              <Mic size={16} color="var(--cc-primary-soft)" />
            </div>
          </Panel>

          {/* System health */}
          <Panel className="px-4 py-3" clip>
            <SectionTitle>SYSTEM HEALTH</SectionTitle>
            <div className="flex items-center gap-3 mt-2">
              <div style={{ position: "relative", width: 82, height: 82 }} className="shrink-0">
                <Radar size={82} color="#1ed760" />
                <Image src={LOGO} alt="" width={34} height={19} className="cc-logo-glow" style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)", width: 34, height: "auto" }} />
              </div>
              <div className="flex-1 flex flex-col gap-1.5">
                {SYSTEM_HEALTH.map((h) => (
                  <div key={h.label} className="flex items-center gap-2" style={{ fontSize: 10 }}>
                    <span className="cc-dot" style={{ color: h.status === "ok" ? "var(--cc-success)" : "var(--cc-accent)", width: 6, height: 6 }} />
                    <span className="cc-label" style={{ flex: 1, color: "var(--cc-muted)" }}>{h.label}</span>
                    <span className="cc-label" style={{ color: h.status === "ok" ? "var(--cc-success)" : "var(--cc-accent)" }}>{h.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function sliceColor(c: "primary" | "accent" | "accentSoft" | "accentSofter") {
  return { primary: "#0f7dff", accent: "#d6b36a", accentSoft: "#e0c48a", accentSofter: "#8fb4d8" }[c];
}
