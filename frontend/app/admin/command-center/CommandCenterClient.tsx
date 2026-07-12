"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Admissions,
  Attendance,
  Backup,
  Bell,
  Branches,
  Calendar,
  Check,
  Children,
  ChevronRight,
  Communication,
  Curriculum,
  Dashboard as DashboardIcon,
  Database,
  Documents,
  Enquiries,
  Events,
  Finance,
  Home,
  ICON_BLUE,
  ICON_GOLD,
  Integration,
  Menu,
  Mic,
  Pulse,
  Reports,
  Security,
  Send,
  Settings,
  Staff,
  Star,
  type IconProps,
} from "./icons";

import "./command-center.css";
import {
  ACTIVITY_FEED,
  AI_BRIEF,
  BRANCH_METRICS,
  BRANCHES,
  CALENDAR,
  CAPACITY_FORECAST,
  CHILDREN_STATUS,
  COMPLIANCE,
  ENQUIRY_SOURCES,
  EVENTS,
  FINANCE,
  FINANCE_ANALYTICS,
  KPIS,
  KPIS_ROW2,
  NAV_ITEMS,
  NOTIFICATIONS,
  OBJECTIVES,
  OCCUPANCY_BARS,
  PARENT_COMMS,
  PERF_GAUGES,
  QUICK_ACTIONS,
  STAFF_STATUS,
  SYSTEM_HEALTH,
  type Branch,
  type Kpi,
  type MiniKpi,
} from "./data";
import {
  Building,
  CentrepieceRings,
  DonutChart,
  Funnel,
  LineChart,
  MiniCalendar,
  MiniDonut,
  Radar,
  RingGauge,
  SentimentLine,
  Stars,
} from "./widgets";
import { useEnquiryPipeline } from "./live";

const LOGO = "/logo/bluenest-logo.png";

// ── CMS wiring: map every widget to the existing admin page it drills into.
// Pages that exist today: /admin/dashboard, /admin/inquiries(+/dashboard),
// /admin/orders, /admin/products, /admin/procurement(+/analytics,/suppliers),
// /admin/order-requests, /admin/purchase-carts, /admin/catalogue, /admin/blog,
// /admin/activity, /admin/users. Modules with no page yet fall back to the
// most relevant existing one.
const R = {
  dashboard: "/admin/dashboard",
  enquiries: "/admin/inquiries",
  enquiriesDash: "/admin/inquiries/dashboard",
  analytics: "/admin/procurement/analytics",
  procurement: "/admin/procurement",
  orders: "/admin/orders",
  users: "/admin/users",
  activity: "/admin/activity",
  blog: "/admin/blog",
} as const;

// Sidebar nav → existing route (modules without a page point at the closest one).
const NAV_LINKS: Record<string, string> = {
  Dashboard: "/admin/command-center",
  Branches: R.dashboard,
  Children: R.enquiries,
  Staff: R.users,
  Enquiries: R.enquiries,
  Admissions: R.enquiriesDash,
  Finance: R.analytics,
  Attendance: R.dashboard,
  Curriculum: R.blog,
  Communication: R.enquiries,
  Events: R.dashboard,
  Reports: R.analytics,
  Documents: R.activity,
  Settings: R.users,
};

// First KPI row → route by kind.
const KPI_LINKS: Record<Kpi["kind"], string> = {
  children: R.enquiries,
  staff: R.users,
  enquiries: R.enquiries,
  occupancy: R.dashboard,
  satisfaction: R.dashboard,
};

// Second KPI row tiles → route by topic (finance / enquiries / people / else).
function tileLink(label: string): string {
  const l = label.toLowerCase();
  if (/(fee|revenue|expense|profit|funding|payroll|cash)/.test(l)) return R.analytics;
  if (/(enquir|visit|application|lead|admission|response)/.test(l)) return R.enquiries;
  if (/(staff|agency)/.test(l)) return R.users;
  if (/(review|website|users|marketing|campaign|newsletter)/.test(l)) return R.analytics;
  return R.dashboard;
}

// Quick actions → destination page.
const QA_LINKS = [R.enquiries, R.enquiriesDash, R.enquiries, R.users, R.dashboard];

type IconCmp = (p: IconProps) => React.ReactElement;

const NAV_ICONS: Record<string, IconCmp> = {
  Dashboard: DashboardIcon,
  Branches,
  Children,
  Staff,
  Enquiries,
  Admissions,
  Finance,
  Attendance,
  Curriculum,
  Communication,
  Events,
  Reports,
  Documents,
  Settings,
};

// Quick actions → pack icons: Add Enquiry, New Admission, Send Message,
// Approve Leave, Schedule Event.
const QA_ICONS: IconCmp[] = [Enquiries, Admissions, Send, Attendance, Calendar];

// System-health rows → brand/system pack icons.
const HEALTH_ICONS: Record<string, IconCmp> = {
  Database,
  Security,
  Backup,
  Integrations: Integration,
  Performance: Pulse,
};

/* ── Small building blocks ─────────────────────────────────────────────── */

function Panel({
  children,
  className = "",
  clip = false,
  href,
}: {
  children: React.ReactNode;
  className?: string;
  clip?: boolean;
  href?: string;
}) {
  const router = useRouter();
  return (
    <div
      className={`cc-panel ${clip ? "cc-panel--clip" : ""} ${href ? "cc-panel--link" : ""} ${className}`}
      onClick={href ? () => router.push(href) : undefined}
      role={href ? "link" : undefined}
      tabIndex={href ? 0 : undefined}
      onKeyDown={href ? (e) => { if (e.key === "Enter") router.push(href); } : undefined}
    >
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
    kpi.kind === "children" ? Children : kpi.kind === "staff" ? Staff : Enquiries;
  return (
    <Panel className="px-4 py-2" clip href={KPI_LINKS[kpi.kind]}>
      <div className="flex items-center gap-3" style={{ height: 54 }}>
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
            <Star size={22} color={ICON_GOLD} fill={ICON_GOLD} />
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
            <Icon size={24} color={ICON_BLUE} />
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
  const m = BRANCH_METRICS.find((x) => x.slug === branch.slug);
  const popRows: [string, string][] = m
    ? [
        ["Children", `${m.children}`],
        ["Staff", `${m.staff}`],
        ["Occupancy", `${m.occupancy}%`],
        ["Revenue", m.revenue],
        ["Open Issues", `${m.issues}`],
        ["Next Event", m.nextEvent],
        ["Review", `${m.review}★`],
      ]
    : [];
  return (
    <Panel className="px-3 py-2.5 cc-branchcard" href={R.dashboard}>
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
      {/* Hover: extended branch intelligence */}
      <div className="cc-branch-pop">
        <p className="cc-heading" style={{ fontSize: 11, color: "var(--cc-accent)", marginBottom: 4 }}>
          {branch.name.toUpperCase()}
        </p>
        {popRows.map(([k, v]) => (
          <div key={k} className="cc-pop-row">
            <span className="cc-label" style={{ color: "var(--cc-muted)" }}>{k}</span>
            <span style={{ color: k === "Open Issues" && v !== "0" ? "var(--cc-warning)" : "var(--cc-text)", fontWeight: 600 }}>{v}</span>
          </div>
        ))}
      </div>
    </Panel>
  );
}

/* ── Executive KPI tile (second row) ───────────────────────────────────── */

const TONE: Record<string, string> = {
  ok: "var(--cc-success)",
  warn: "var(--cc-warning)",
  bad: "var(--cc-error)",
  accent: "var(--cc-accent)",
  muted: "var(--cc-muted)",
};

function MiniKpiTile({ kpi }: { kpi: MiniKpi }) {
  const router = useRouter();
  const color = kpi.tone ? TONE[kpi.tone] : "var(--cc-text)";
  return (
    <div className="cc-tile cc-tile--link" onClick={() => router.push(tileLink(kpi.label))}>
      <p className="cc-label" style={{ fontSize: 8, color: "var(--cc-muted)", lineHeight: 1.2 }}>
        {kpi.label}
      </p>
      <p className="cc-heading" style={{ fontSize: 19, lineHeight: 1.1, color, marginTop: 3, letterSpacing: "0.01em" }}>
        {kpi.value}
      </p>
    </div>
  );
}

/* Small stat row used by Staff Status / Children's Status / Parent Comms. */
function StatRows({ rows }: { rows: { label: string; count?: number; value?: string; tone?: string }[] }) {
  return (
    <div className="mt-2 flex flex-col gap-1.5">
      {rows.map((r) => (
        <div key={r.label} className="flex items-center gap-2" style={{ fontSize: 11 }}>
          <span className="cc-dot" style={{ width: 6, height: 6, color: r.tone ? TONE[r.tone] : "var(--cc-primary)" }} />
          <span className="cc-label" style={{ flex: 1, color: "var(--cc-muted)" }}>{r.label}</span>
          <span className="cc-heading" style={{ color: "var(--cc-text)" }}>{r.value ?? r.count}</span>
        </div>
      ))}
    </div>
  );
}

/* ── Capacity forecast (range-tabbed line chart) ───────────────────────── */

function ForecastCard() {
  const [range, setRange] = useState<"7d" | "30d" | "term">("7d");
  const f = CAPACITY_FORECAST[range];
  const label = range === "7d" ? "next 7 days" : range === "30d" ? "next 30 days" : "next term";
  return (
    <Panel className="px-4 py-2" clip href="/admin/dashboard">
      <div className="flex items-center justify-between">
        <p className="cc-heading" style={{ fontSize: 12 }}>CAPACITY FORECAST</p>
        <div className="flex gap-1">
          {(["7d", "30d", "term"] as const).map((r) => (
            <button
              key={r}
              className={`cc-tab ${range === r ? "cc-tab--active" : ""}`}
              onClick={() => setRange(r)}
            >
              {r === "7d" ? "7 Day" : r === "30d" ? "30 Day" : "Term"}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-2">
        <LineChart points={f.points} labels={f.labels} height={92} />
      </div>
      <p style={{ fontSize: 9.5, color: "var(--cc-muted)", marginTop: 2 }}>
        Projected occupancy · {label}
      </p>
    </Panel>
  );
}

/* ── Main composition ──────────────────────────────────────────────────── */

export default function CommandCenterClient() {
  const router = useRouter();
  const go = (href: string) => router.push(href);
  const byCorner = (c: Branch["corner"]) => BRANCHES.find((b) => b.corner === c)!;

  // Live enquiries/admissions pipeline (real backend data when signed in).
  const pipeline = useEnquiryPipeline();

  // Overlay live enquiry figures onto the first KPI row (Enquiries card).
  const kpis: Kpi[] = pipeline.live
    ? KPIS.map((k) =>
        k.kind === "enquiries"
          ? { ...k, value: String(pipeline.enquiriesTotal), sub: `+${pipeline.enquiriesNew} new` }
          : k,
      )
    : KPIS;

  // Overlay live figures onto the relevant second-row tiles.
  const tiles: MiniKpi[] = pipeline.live
    ? KPIS_ROW2.map((t) => {
        if (t.label === "Booked Visits") return { ...t, value: String(pipeline.bookedVisits) };
        if (t.label === "Applications") return { ...t, value: String(pipeline.applications) };
        if (t.label === "Enquiry Response" && pipeline.avgResponse) return { ...t, value: pipeline.avgResponse };
        return t;
      })
    : KPIS_ROW2;

  return (
    <div className="cc-root">
      <div className="cc-stage">
        {/* ══ Top bar ══════════════════════════════════════════════════ */}
        <header className="flex items-start justify-between gap-6 mb-2">
          <div style={{ width: 230 }}>
            <TopClock />
          </div>

          <div className="flex-1 flex flex-col items-center pt-1">
            <div className="flex items-center gap-4">
              <Image src={LOGO} alt="Blue Nest" width={73} height={40} className="cc-logo-glow" style={{ width: 73, height: 40 }} priority />
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
            <button className="cc-pill" onClick={() => go(R.activity)}><Bell size={14} /> 5</button>
            <button className="cc-pill" onClick={() => go(R.enquiries)}><Communication size={14} /> 3</button>
            <button className="cc-pill" style={{ padding: 8 }} onClick={() => go(R.users)}><Settings size={14} /></button>
            <button className="cc-pill" style={{ padding: 8 }} onClick={() => go(R.dashboard)}><Menu size={14} /></button>
          </div>
        </header>

        {/* sub-header */}
        <div className="flex justify-center mb-2">
          <p className="cc-label" style={{ fontSize: 10.5, color: "var(--cc-primary-soft)", letterSpacing: "0.24em" }}>
            <span style={{ color: "var(--cc-accent)" }}>◈</span> MD COMMAND CENTER
            <span style={{ color: "var(--cc-muted-dim)", margin: "0 10px" }}>•</span>
            CENTRAL MANAGEMENT SYSTEM
          </p>
        </div>

        {/* ══ Body: sidebar | main | right ══════════════════════════════ */}
        <div className="cc-body">
          {/* ── Sidebar ─────────────────────────────────────────── */}
          <aside style={{ width: 230 }} className="shrink-0 flex flex-col gap-2 cc-col-scroll">
            <Panel className="px-4 py-2" clip>
              <p className="cc-label text-center" style={{ fontSize: 9, color: "var(--cc-muted)", letterSpacing: "0.2em" }}>
                MD PROFILE
              </p>
              <div className="flex justify-center my-2">
                <div style={{ position: "relative", width: 76, height: 76 }}>
                  <div className="cc-spin-slow" style={{ position: "absolute", inset: -6, borderRadius: "50%", border: "1px dashed rgba(214,179,106,0.5)" }} />
                  <div
                    style={{
                      width: 76,
                      height: 76,
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
                    <button key={item} className={`cc-nav-item ${active ? "cc-nav-item--active" : ""}`} onClick={() => go(NAV_LINKS[item] ?? R.dashboard)}>
                      <Icon size={15} />
                      <span className="flex-1 text-left">{item}</span>
                      {active && <ChevronRight size={13} />}
                    </button>
                  );
                })}
              </nav>
            </Panel>

            <Panel className="px-4 py-2" clip>
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

          {/* ── Right area: the workspace row (main + right column) and the
               bottom bar stack beside the full-height sidebar rail, matching the
               design. The sidebar's height therefore follows this whole area (its
               System Status panel pins to the bottom) instead of forcing a gap. ── */}
          <div className="flex-1 flex flex-col gap-2 min-w-0 cc-col-scroll">
            <div className="flex gap-3 items-stretch">
              {/* ── Main workspace ──────────────────────────────────── */}
              <main className="flex-1 flex flex-col gap-2 min-w-0">
            {/* KPI row */}
            <div className="grid grid-cols-5 gap-3">
              {kpis.map((k) => (
                <KpiCard key={k.key} kpi={k} />
              ))}
            </div>

            {/* Executive KPI row 2 — dense operational tiles */}
            <Panel className="px-3 py-2" clip>
              <div className="cc-tiles">
                {tiles.map((k) => (
                  <MiniKpiTile key={k.label} kpi={k} />
                ))}
              </div>
            </Panel>

            {/* Branch overview centrepiece */}
            <Panel className="px-4 py-2" clip>
              <p className="cc-heading text-center" style={{ fontSize: 15, color: "var(--cc-text)", letterSpacing: "0.2em", marginBottom: 4 }}>
                BRANCH OVERVIEW
              </p>
              <div style={{ position: "relative", height: 286 }}>
                {/* Connector lines fanning from the centrepiece to each branch card,
                    with a flowing dash so data appears to stream to the branches */}
                <svg
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                  aria-hidden
                  style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
                >
                  <defs>
                    <linearGradient id="cc-link" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="rgba(0,212,255,0.6)" />
                      <stop offset="100%" stopColor="rgba(255,200,87,0.5)" />
                    </linearGradient>
                  </defs>
                  {[
                    [31, 22],
                    [69, 22],
                    [31, 62],
                    [69, 62],
                    [50, 91],
                  ].map(([x, y]) => (
                    <line
                      key={`${x}-${y}`}
                      className="cc-link-flow"
                      x1={50}
                      y1={49}
                      x2={x}
                      y2={y}
                      stroke="url(#cc-link)"
                      strokeWidth={1}
                      strokeDasharray="3 4"
                      vectorEffect="non-scaling-stroke"
                      opacity={0.6}
                    />
                  ))}
                </svg>
                {/* Centrepiece */}
                <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)", width: 300, height: 300 }}>
                  <CentrepieceRings size={300} />
                  {/* Sonar pings emanating from the core */}
                  <span className="cc-ping" />
                  <span className="cc-ping" style={{ animationDelay: "1.05s" }} />
                  <span className="cc-ping" style={{ animationDelay: "2.1s" }} />
                  <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                    {/* Rotating halo behind the enlarged logo */}
                    <span className="cc-halo cc-spin-slow" />
                    <Image src={LOGO} alt="Blue Nest" width={182} height={100} priority className="cc-logo-glow" style={{ width: 182, height: 100, position: "relative" }} />
                    <p className="cc-serif" style={{ fontSize: 30, letterSpacing: "0.22em", color: "var(--cc-primary-soft)", marginTop: 8, textShadow: "0 0 18px rgba(0,212,255,0.65)" }}>
                      BLUE NEST
                    </p>
                    <p className="cc-label" style={{ fontSize: 9, letterSpacing: "0.34em", color: "var(--cc-muted)", marginTop: 3 }}>
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

            {/* Bottom cluster: funnel | attendance | sentiment */}
            <div className="grid gap-3" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
              <Panel className="px-4 py-2" clip href="/admin/inquiries/dashboard">
                <SectionTitle sub={pipeline.live ? "● Live" : "This Month"}>ADMISSION PIPELINE</SectionTitle>
                <div className="mt-2">
                  <Funnel stages={pipeline.funnel} />
                </div>
                <div className="flex justify-end mt-1">
                  <div className="flex flex-col items-center">
                    <RingGauge value={pipeline.conversion} size={64} big={`${pipeline.conversion}%`} color="var(--cc-accent)" track="rgba(214,179,106,0.15)" />
                    <span className="cc-label" style={{ fontSize: 8, color: "var(--cc-muted)" }}>CONVERSION</span>
                  </div>
                </div>
              </Panel>

              {/* Attendance — one chart per branch, scrollable */}
              <Panel className="px-4 py-2" clip href="/admin/dashboard">
                <SectionTitle sub="Per branch · scroll">ATTENDANCE OVERVIEW</SectionTitle>
                <div className="cc-scrolly mt-1" style={{ maxHeight: 190 }}>
                  {BRANCH_METRICS.map((m) => (
                    <div key={m.slug} className="cc-brow">
                      <div style={{ width: 84 }} className="shrink-0">
                        <p className="cc-heading" style={{ fontSize: 10, color: "var(--cc-accent)" }}>{m.name}</p>
                        <p style={{ fontSize: 9, color: "var(--cc-muted)" }}>avg {m.attendance.average}%</p>
                      </div>
                      <div className="flex items-end gap-1.5" style={{ height: 40, flex: 1 }}>
                        {m.attendance.days.map((d) => (
                          <div key={d.day} className="flex flex-col items-center gap-0.5" style={{ flex: 1 }}>
                            <span style={{ fontSize: 7, color: "var(--cc-muted-dim)" }}>{d.pct}</span>
                            <div className="cc-attbar" style={{ width: "70%", height: ((d.pct - 82) / 18) * 30 + 6 }} />
                          </div>
                        ))}
                      </div>
                      <RingGauge value={m.attendance.average} size={40} big={`${m.attendance.average}`} color="var(--cc-primary)" />
                    </div>
                  ))}
                </div>
              </Panel>

              {/* Parent sentiment — one spark per branch, scrollable */}
              <Panel className="px-4 py-2" clip href="/admin/dashboard">
                <SectionTitle sub="Per branch · scroll">PARENT SENTIMENT</SectionTitle>
                <div className="cc-scrolly mt-1" style={{ maxHeight: 190 }}>
                  {BRANCH_METRICS.map((m) => (
                    <div key={m.slug} className="cc-brow">
                      <div style={{ width: 84 }} className="shrink-0">
                        <p className="cc-heading" style={{ fontSize: 10, color: "var(--cc-accent)" }}>{m.name}</p>
                        <div className="flex items-center gap-1">
                          <span className="cc-heading" style={{ fontSize: 13, color: "var(--cc-text)" }}>{m.sentiment.score}</span>
                          <Stars size={8} />
                        </div>
                      </div>
                      <div className="flex-1">
                        <SentimentLine points={m.sentiment.points} height={40} />
                      </div>
                    </div>
                  ))}
                </div>
              </Panel>
            </div>

            {/* ── Executive widget row A: occupancy · sources · gauges ── */}
            <div className="grid gap-3" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
              <Panel className="px-4 py-2" clip href="/admin/dashboard">
                <SectionTitle sub="Live">OCCUPANCY HEATMAP</SectionTitle>
                <div className="mt-2 flex flex-col gap-2">
                  {OCCUPANCY_BARS.map((b) => (
                    <div key={b.name} className="flex items-center gap-2">
                      <span className="cc-label" style={{ width: 82, fontSize: 9.5, color: "var(--cc-muted)" }}>{b.name}</span>
                      <div className="cc-heat-track">
                        <div className="cc-heat-fill" style={{ width: `${b.pct}%` }} />
                      </div>
                      <span className="cc-heading" style={{ width: 34, textAlign: "right", fontSize: 12, color: "var(--cc-text)" }}>{b.pct}%</span>
                    </div>
                  ))}
                </div>
              </Panel>

              <Panel className="px-4 py-2" clip href="/admin/inquiries/dashboard">
                <SectionTitle sub="This Month">ENQUIRY SOURCES</SectionTitle>
                <div className="flex items-center gap-3 mt-1">
                  <MiniDonut slices={ENQUIRY_SOURCES} size={118} center="134" sub="ENQUIRIES" />
                  <div className="flex-1 flex flex-col gap-1">
                    {ENQUIRY_SOURCES.map((s) => (
                      <div key={s.label} className="flex items-center gap-1.5" style={{ fontSize: 9.5 }}>
                        <span style={{ width: 8, height: 8, borderRadius: 2, background: s.color }} />
                        <span className="cc-label" style={{ flex: 1, color: "var(--cc-muted)" }}>{s.label}</span>
                        <span style={{ color: "var(--cc-text)", fontWeight: 600 }}>{s.pct}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Panel>

              <Panel className="px-4 py-2" clip href="/admin/dashboard">
                <SectionTitle sub="Live">PERFORMANCE</SectionTitle>
                <div className="grid grid-cols-3 gap-1 mt-2" style={{ justifyItems: "center" }}>
                  {PERF_GAUGES.map((g) => {
                    const color = g.tone === "gold" ? "var(--cc-accent)" : g.tone === "green" ? "var(--cc-success)" : "var(--cc-primary)";
                    return (
                      <div key={g.label} className="flex flex-col items-center">
                        <RingGauge value={g.value} size={62} big={`${g.value}%`} color={color} />
                        <span className="cc-label" style={{ fontSize: 7.5, color: "var(--cc-muted)", marginTop: -2 }}>{g.label}</span>
                      </div>
                    );
                  })}
                </div>
              </Panel>
            </div>

            {/* ── Executive widget row B: staff · children · compliance ── */}
            <div className="grid gap-3" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
              <Panel className="px-4 py-2" clip href="/admin/users">
                <SectionTitle sub="Today">STAFF STATUS</SectionTitle>
                <StatRows rows={STAFF_STATUS} />
              </Panel>
              <Panel className="px-4 py-2" clip href="/admin/inquiries">
                <SectionTitle sub="Today">CHILDREN&apos;S STATUS</SectionTitle>
                <StatRows rows={CHILDREN_STATUS} />
              </Panel>
              <Panel className="px-4 py-2" clip href="/admin/dashboard">
                <SectionTitle sub="Traffic light">COMPLIANCE CENTRE</SectionTitle>
                <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5">
                  {COMPLIANCE.map((c) => (
                    <div key={c.label} className="flex items-center gap-2" style={{ fontSize: 10.5 }}>
                      <span className="cc-dot" style={{ width: 7, height: 7, color: TONE[c.status] }} />
                      <span className="cc-label" style={{ color: "var(--cc-muted)" }}>{c.label}</span>
                    </div>
                  ))}
                </div>
              </Panel>
            </div>
          </main>

          {/* ── Right column ────────────────────────────────────── */}
          <aside style={{ width: 300 }} className="shrink-0 flex flex-col gap-3">
            <Panel className="px-4 py-2" clip href="/admin/procurement/analytics">
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
              {/* Expanded analytics: cash figures + revenue trend vs budget */}
              <div className="mt-3 pt-2 grid grid-cols-2 gap-x-3 gap-y-1.5" style={{ borderTop: "1px solid var(--cc-line)" }}>
                {FINANCE_ANALYTICS.stats.map((s) => (
                  <div key={s.label} className="flex items-baseline justify-between gap-2" style={{ fontSize: 10.5 }}>
                    <span className="cc-label" style={{ color: "var(--cc-muted)" }}>{s.label}</span>
                    <span className="cc-heading" style={{ color: TONE[s.tone] ?? "var(--cc-text)" }}>{s.value}</span>
                  </div>
                ))}
              </div>
              <div className="mt-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="cc-label" style={{ fontSize: 8.5, color: "var(--cc-muted)" }}>REVENUE · BUDGET vs ACTUAL</span>
                  <span className="cc-label" style={{ fontSize: 8.5, color: "var(--cc-accent)" }}>— — budget</span>
                </div>
                <LineChart points={FINANCE_ANALYTICS.trend} budget={FINANCE_ANALYTICS.budget} height={70} />
              </div>
              <div className="flex justify-center mt-2 pt-2" style={{ borderTop: "1px solid var(--cc-line)" }}>
                <button className="cc-linkbtn">View Full Financial Report <ChevronRight size={11} /></button>
              </div>
            </Panel>

            <ForecastCard />

            {/* Monthly calendar (replaces the small events card) */}
            <Panel className="px-4 py-2" clip href="/admin/dashboard">
              <SectionTitle sub={CALENDAR.label}>CALENDAR</SectionTitle>
              <div className="mt-2">
                <MiniCalendar year={CALENDAR.year} month={CALENDAR.month} events={CALENDAR.events} legend={CALENDAR.legend} />
              </div>
              <div className="mt-2 pt-2 flex flex-col gap-1.5" style={{ borderTop: "1px solid var(--cc-line)" }}>
                {EVENTS.map((e) => (
                  <div key={e.title} className="flex items-center gap-2" style={{ fontSize: 10.5 }}>
                    <Calendar size={12} color={ICON_BLUE} />
                    <span style={{ flex: 1, color: "var(--cc-text)" }}>{e.title}</span>
                    <span className="cc-label" style={{ fontSize: 8.5, color: "var(--cc-accent)" }}>{e.month}</span>
                    <span className="cc-heading" style={{ width: 18, textAlign: "right", color: "var(--cc-text)" }}>{e.day}</span>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel className="px-4 py-3" clip href="/admin/activity">
              <SectionTitle>NOTIFICATIONS</SectionTitle>
              <div className="mt-2 flex flex-col gap-2.5">
                {NOTIFICATIONS.map((n) => (
                  <div key={n.title} className="flex items-start gap-2.5">
                    <Communication size={14} color={n.severity === "warning" ? "var(--cc-warning)" : ICON_BLUE} style={{ marginTop: 2 }} />
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

            {/* ── Live activity feed ── */}
            <Panel className="px-4 py-3" clip href="/admin/activity">
              <SectionTitle sub="Real-time">LIVE ACTIVITY</SectionTitle>
              <div className="cc-feed mt-2">
                {ACTIVITY_FEED.map((a, i) => (
                  <div key={i} className="cc-feed-row">
                    <span className="cc-heading" style={{ width: 34, fontSize: 10, color: "var(--cc-primary-soft)" }}>{a.time}</span>
                    <span style={{ flex: 1, fontSize: 10.5, color: "var(--cc-text)", lineHeight: 1.35 }}>{a.text}</span>
                  </div>
                ))}
              </div>
            </Panel>

            {/* ── Parent communications ── */}
            <Panel className="px-4 py-3" clip href="/admin/inquiries">
              <SectionTitle sub="Today">PARENT COMMS</SectionTitle>
              <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5">
                {PARENT_COMMS.map((p) => (
                  <div key={p.label} className="flex items-baseline justify-between gap-2" style={{ fontSize: 10.5 }}>
                    <span className="cc-label" style={{ color: "var(--cc-muted)" }}>{p.label}</span>
                    <span className="cc-heading" style={{ color: "var(--cc-text)" }}>{p.value}</span>
                  </div>
                ))}
              </div>
            </Panel>
              </aside>
            </div>

            {/* ══ Bottom bar ═══════════════════════════════════════════════ */}
            <div className="grid gap-3" style={{ gridTemplateColumns: "1.1fr 1.2fr 1fr 1fr" }}>
          {/* Quick actions */}
          <Panel className="px-4 py-2" clip>
            <SectionTitle>QUICK ACTIONS</SectionTitle>
            <div className="grid grid-cols-5 gap-2 mt-2">
              {QUICK_ACTIONS.map((a, i) => {
                const Icon = QA_ICONS[i];
                return (
                  <button key={a} className="cc-action-btn" onClick={() => go(QA_LINKS[i] ?? R.dashboard)}>
                    <Icon size={17} color={ICON_BLUE} />
                    {a}
                  </button>
                );
              })}
            </div>
            <button className="cc-action-btn mt-2" style={{ flexDirection: "row", width: "100%", justifyContent: "center", gap: 8, fontSize: 11 }} onClick={() => go(R.analytics)}>
              <Reports size={15} color={ICON_GOLD} /> GENERATE REPORT
            </button>
          </Panel>

          {/* Mission objectives */}
          <Panel className="px-4 py-2" clip href="/admin/dashboard">
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

          {/* AI executive brief */}
          <Panel className="px-4 py-2" clip>
            <SectionTitle sub="Executive brief">AI ASSISTANT</SectionTitle>
            <div className="flex items-start gap-3 mt-2">
              <div
                className="shrink-0 flex items-center justify-center"
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: "50%",
                  border: "1.5px solid var(--cc-accent)",
                  background: "radial-gradient(circle, rgba(54,169,255,0.28), transparent)",
                  boxShadow: "0 0 20px rgba(54,169,255,0.4)",
                  animation: "cc-pulse 3s ease-in-out infinite",
                  color: "var(--cc-accent)",
                  fontFamily: "var(--font-admin-heading)",
                  fontWeight: 700,
                  fontSize: 15,
                }}
              >
                AI
              </div>
              <p style={{ fontSize: 10.5, color: "var(--cc-muted)", lineHeight: 1.45 }}>
                <span style={{ color: "var(--cc-accent)" }}>{AI_BRIEF.greeting}</span> {AI_BRIEF.intro}
              </p>
            </div>
            <ul className="mt-2 flex flex-col gap-1">
              {AI_BRIEF.points.map((p) => (
                <li key={p} className="flex items-start gap-1.5" style={{ fontSize: 10, color: "var(--cc-text)", lineHeight: 1.35 }}>
                  <span style={{ color: "var(--cc-primary)" }}>▹</span>
                  <span>{p}</span>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {AI_BRIEF.actions.map((a, i) => (
                <button
                  key={a}
                  className="cc-ai-btn"
                  onClick={() => go([R.analytics, R.enquiries, R.activity, R.dashboard, R.dashboard][i] ?? R.dashboard)}
                >
                  {a}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <div className="flex items-end gap-[3px]" style={{ height: 18, flex: 1 }}>
                {Array.from({ length: 40 }).map((_, i) => (
                  <span key={i} className="cc-wavebar" style={{ height: 16, animationDelay: `${(i % 10) * 0.09}s` }} />
                ))}
              </div>
              <Mic size={15} color={ICON_BLUE} />
            </div>
          </Panel>

          {/* System health */}
          <Panel className="px-4 py-2" clip href="/admin/activity">
            <SectionTitle>SYSTEM HEALTH</SectionTitle>
            <div className="flex items-center gap-3 mt-2">
              <div style={{ position: "relative", width: 82, height: 82 }} className="shrink-0">
                <Radar size={82} color="#1ed760" />
                <Image src={LOGO} alt="" width={34} height={19} className="cc-logo-glow" style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)", width: 34, height: 19 }} />
              </div>
              <div className="flex-1 flex flex-col gap-1.5">
                {SYSTEM_HEALTH.map((h) => {
                  const HIcon = HEALTH_ICONS[h.label] ?? Pulse;
                  const tone = h.status === "ok" ? "var(--cc-success)" : "var(--cc-accent)";
                  return (
                    <div key={h.label} className="flex items-center gap-2" style={{ fontSize: 10 }}>
                      <HIcon size={13} color={tone} />
                      <span className="cc-label" style={{ flex: 1, color: "var(--cc-muted)" }}>{h.label}</span>
                      <span className="cc-label" style={{ color: tone }}>{h.value}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </Panel>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function sliceColor(c: "primary" | "accent" | "accentSoft" | "accentSofter") {
  return { primary: "#0f7dff", accent: "#d6b36a", accentSoft: "#e0c48a", accentSofter: "#8fb4d8" }[c];
}
