"use client";

import {
  FINANCE, FINANCE_ANALYTICS, CAPACITY_FORECAST, ENQUIRY_SOURCES,
  STAFF_STATUS, COMPLIANCE, PERF_GAUGES, AI_COMMAND, type BranchMetric,
} from "../data";
import { DonutChart, LineChart, MiniDonut, RingGauge, Funnel, SentimentLine } from "../widgets";
import { useEnquiryPipeline, useBranchMetrics, useAttendanceToday, useStaffStats, useDailyStats, useChildrenStats, staffPresentByBranch } from "../live";
import type { AiTab } from "./osdata";

const TONE: Record<string, string> = {
  ok: "var(--cc-success)", warn: "var(--cc-warning)", bad: "var(--cc-error)",
  accent: "var(--cc-accent)", muted: "var(--cc-muted)", low: "var(--cc-success)", med: "var(--cc-warning)", high: "var(--cc-error)",
};
const statusColor = (s: string) => s === "ok" ? "var(--cc-success)" : s === "warn" ? "var(--cc-warning)" : "var(--cc-error)";
const gaugeColor = (t: string) => t === "gold" ? "var(--cc-accent)" : t === "green" ? "var(--cc-success)" : "var(--cc-primary)";

function Card({ title, sub, span = 1, children }: { title: string; sub?: string; span?: number; children: React.ReactNode }) {
  return (
    <div className="cc-tab-card" style={{ gridColumn: `span ${span}` }}>
      <div className="flex items-baseline justify-between">
        <p className="cc-tab-card-t">{title}</p>
        {sub && <span className="cc-label" style={{ fontSize: 8, color: "var(--cc-muted)" }}>{sub}</span>}
      </div>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}
function Tile({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="cc-tab-tile">
      <p className="cc-label" style={{ fontSize: 7.5, color: "var(--cc-muted)" }}>{label}</p>
      <p className="cc-heading" style={{ fontSize: 16, color: tone ? TONE[tone] : "var(--cc-text)", lineHeight: 1.1 }}>{value}</p>
    </div>
  );
}
function Rows({ rows }: { rows: [string, string, string?][] }) {
  return (
    <div className="flex flex-col gap-1">
      {rows.map(([k, v, tone]) => (
        <div key={k} className="flex items-baseline justify-between gap-2" style={{ fontSize: 10.5 }}>
          <span className="cc-label" style={{ color: "var(--cc-muted)" }}>{k}</span>
          <span className="cc-heading" style={{ color: tone ? TONE[tone] : "var(--cc-text)" }}>{v}</span>
        </div>
      ))}
    </div>
  );
}
function BranchTable({ cols, cell, branches }: { cols: string[]; cell: (m: BranchMetric) => (string | { v: string; c: string })[]; branches: BranchMetric[] }) {
  return (
    <table className="cc-tab-table">
      <thead><tr><th>Branch</th>{cols.map((c) => <th key={c}>{c}</th>)}</tr></thead>
      <tbody>
        {branches.map((m) => (
          <tr key={m.slug}>
            <td><span className="cc-dot" style={{ width: 6, height: 6, color: statusColor(m.status), marginRight: 5 }} />{m.name}</td>
            {cell(m).map((c, i) => <td key={i} style={{ color: typeof c === "object" ? c.c : "var(--cc-text)" }}>{typeof c === "object" ? c.v : c}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function AITabContent({ tab }: { tab: AiTab }) {
  const pipeline = useEnquiryPipeline();
  const { metrics: branches } = useBranchMetrics();
  const attendance = useAttendanceToday();
  const staff = useStaffStats();
  const daily = useDailyStats();
  const childrenStats = useChildrenStats();
  const staffPresent = staffPresentByBranch(staff);
  // Live values for the performance gauges that DO have a backend source, so the
  // gauges don't contradict the live KPI bar on the same page.
  const liveGauge: Record<string, number> = { Occupancy: childrenStats.occupancyRate, Attendance: attendance.attendanceRate };
  // Live "Staff Today" tiles when the staff module has data; else the mock.
  const staffTiles = staff.live
    ? [
        { label: "Present", count: staff.present, tone: "ok" as const },
        { label: "Annual Leave", count: staff.onLeave, tone: "muted" as const },
        { label: "Training", count: staff.training, tone: "muted" as const },
        { label: "Sick Leave", count: staff.sick, tone: "bad" as const },
        { label: "Late Arrival", count: staff.lateArrival, tone: "warn" as const },
        { label: "Agency Staff", count: staff.agency, tone: "warn" as const },
      ]
    : STAFF_STATUS;

  if (tab === "Operations")
    return (
      <div className="cc-tab-grid">
        <Card title="TODAY · GROUP" span={3}>
          <div className="cc-tab-tiles">
            <Tile label="Children In" value={String(attendance.present)} tone="ok" />
            <Tile label="Child Attendance" value={`${attendance.attendanceRate}%`} tone="ok" />
            <Tile label="Staff Present" value={String(staff.present)} />
            <Tile label="Safeguarding" value={String(daily.safeguardingOpen)} tone="warn" />
            <Tile label="Late Pickups" value={String(attendance.latePickups)} tone="warn" />
            <Tile label="Meals Served" value={String(daily.mealsServed)} />
            <Tile label="Medication Due" value={String(daily.medicationDue)} tone="warn" />
            <Tile label="Incidents" value={String(daily.incidentsToday)} tone="bad" />
          </div>
        </Card>
        <Card title="BRANCH OPERATIONS" span={3}>
          <BranchTable branches={branches} cols={["Child Att.", "Occupancy", "Staff", "Alerts"]} cell={(m) => [
            `${m.attendanceToday}%`, `${m.occupancy}%`, `${m.staff}`,
            { v: `${m.alerts}`, c: m.alerts > 1 ? "var(--cc-warning)" : "var(--cc-text)" },
          ]} />
        </Card>
      </div>
    );

  if (tab === "Finance")
    return (
      <div className="cc-tab-grid">
        <Card title="REVENUE MIX" sub="This month">
          <div style={{ height: 130 }} className="flex justify-center"><DonutChart slices={FINANCE.slices} total={FINANCE.total} caption="REVENUE" /></div>
        </Card>
        <Card title="P&L">
          <Rows rows={FINANCE_ANALYTICS.stats.map((s) => [s.label, s.value, s.tone] as [string, string, string])} />
        </Card>
        <Card title="BUDGET vs ACTUAL" sub="12 mo">
          <LineChart points={FINANCE_ANALYTICS.trend} budget={FINANCE_ANALYTICS.budget} height={128} />
        </Card>
        <Card title="REVENUE BY BRANCH" span={3}>
          <BranchTable branches={branches} cols={["Revenue", "Occupancy", "Children"]} cell={(m) => [m.revenue, `${m.occupancy}%`, `${m.children}`]} />
        </Card>
      </div>
    );

  if (tab === "Admissions")
    return (
      <div className="cc-tab-grid">
        <Card title="PIPELINE" sub={pipeline.live ? "● Live" : "Mock"}>
          <Funnel stages={pipeline.funnel} />
        </Card>
        <Card title="KEY NUMBERS">
          <div className="cc-tab-tiles" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <Tile label="Enquiries" value={String(pipeline.enquiriesTotal)} tone="accent" />
            <Tile label="New" value={String(pipeline.enquiriesNew)} tone="ok" />
            <Tile label="Booked Visits" value={String(pipeline.bookedVisits)} />
            <Tile label="Applications" value={String(pipeline.applications)} />
            <Tile label="Conversion" value={`${pipeline.conversion}%`} tone="accent" />
            <Tile label="Avg Response" value={pipeline.avgResponse ?? "—"} />
          </div>
        </Card>
        <Card title="SOURCES" sub="This month">
          <div className="flex items-center gap-2">
            <MiniDonut slices={ENQUIRY_SOURCES} size={98} center="134" sub="ENQ" />
            <div className="flex-1 flex flex-col gap-0.5">
              {ENQUIRY_SOURCES.map((s) => (
                <div key={s.label} className="flex items-center gap-1.5" style={{ fontSize: 9 }}>
                  <span style={{ width: 7, height: 7, borderRadius: 2, background: s.color }} />
                  <span className="cc-label" style={{ flex: 1, color: "var(--cc-muted)" }}>{s.label}</span>
                  <span style={{ color: "var(--cc-text)" }}>{s.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    );

  if (tab === "People")
    return (
      <div className="cc-tab-grid">
        <Card title="STAFF TODAY" span={2}>
          <div className="cc-tab-tiles">
            {staffTiles.map((s) => <Tile key={s.label} label={s.label} value={String(s.count)} tone={s.tone} />)}
          </div>
        </Card>
        <Card title="WORKFORCE">
          <div className="grid grid-cols-2 gap-1" style={{ justifyItems: "center" }}>
            {PERF_GAUGES.filter((g) => ["Staff Happiness", "Retention"].includes(g.label)).map((g) => (
              <div key={g.label} className="flex flex-col items-center">
                <RingGauge value={g.value} size={58} big={`${g.value}%`} color={gaugeColor(g.tone)} />
                <span className="cc-label" style={{ fontSize: 7, color: "var(--cc-muted)" }}>{g.label}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card title="STAFF BY BRANCH" span={3}>
          <BranchTable branches={branches} cols={["Staff", "Present", "Ratio"]} cell={(m) => {
            const present = staffPresent.get(m.slug);
            const childrenIn = Math.round((m.children * m.attendanceToday) / 100);
            // Real staff:child ratio from present staff + children in today (— when unknown).
            const ratio = present && present > 0 ? `1:${Math.round(childrenIn / present)}` : "—";
            return [`${m.staff}`, present != null ? `${present}` : "—", ratio];
          }} />
        </Card>
      </div>
    );

  if (tab === "Ofsted")
    return (
      <div className="cc-tab-grid">
        <Card title="COMPLIANCE" sub="Traffic light" span={2}>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
            {COMPLIANCE.map((c) => (
              <div key={c.label} className="flex items-center gap-2" style={{ fontSize: 10.5 }}>
                <span className="cc-dot" style={{ width: 7, height: 7, color: TONE[c.status] }} />
                <span className="cc-label" style={{ color: "var(--cc-muted)" }}>{c.label}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card title="INSPECTION">
          <Rows rows={[["Last rating", "Good", "ok"], ["Inspected", "Mar 2023"], ["SEF progress", "78%", "accent"], ["Next review", "3 days", "warn"]]} />
          <div style={{ height: 5, borderRadius: 3, background: "rgba(64,130,210,0.15)", marginTop: 8 }}>
            <div style={{ width: "78%", height: "100%", borderRadius: 3, background: "linear-gradient(90deg, var(--cc-primary), var(--cc-success))" }} />
          </div>
        </Card>
        <Card title="OPEN ACTIONS" span={3}>
          <div className="flex flex-col gap-1.5">
            {[
              { t: `Review ${daily.safeguardingOpen} open safeguarding concern${daily.safeguardingOpen === 1 ? "" : "s"}`, p: "high" },
              { t: `Renew ${staff.dbsExpiring} DBS check${staff.dbsExpiring === 1 ? "" : "s"} (expiring)`, p: "med" },
              { t: "Refresh First Aid certificates ×3", p: "med" },
              { t: "Complete SEF section 4", p: "low" },
            ].map((a) => (
              <div key={a.t} className="flex items-center gap-2" style={{ fontSize: 10.5 }}>
                <span className="cc-dot" style={{ width: 6, height: 6, color: TONE[a.p] }} />
                <span style={{ color: "var(--cc-text)" }}>{a.t}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    );

  if (tab === "Analytics")
    return (
      <div className="cc-tab-grid">
        <Card title="OCCUPANCY FORECAST" sub="Next term">
          <LineChart points={CAPACITY_FORECAST.term.points} labels={CAPACITY_FORECAST.term.labels} height={110} />
        </Card>
        <Card title="REVENUE TREND" sub="12 mo">
          <LineChart points={FINANCE_ANALYTICS.trend} budget={FINANCE_ANALYTICS.budget} height={110} />
        </Card>
        <Card title="PARENT SENTIMENT" sub="Group">
          <SentimentLine points={AI_COMMAND.recommendations.length ? [0.3, 0.4, 0.36, 0.5, 0.55, 0.62, 0.7, 0.78, 0.86, 0.92] : []} height={90} />
          <p className="cc-heading" style={{ fontSize: 18, color: "var(--cc-text)", marginTop: 2 }}>4.8<span style={{ fontSize: 10, color: "var(--cc-muted)" }}> / 5</span></p>
        </Card>
        <Card title="PERFORMANCE" span={3}>
          <div className="grid grid-cols-6 gap-1" style={{ justifyItems: "center" }}>
            {PERF_GAUGES.map((g) => {
              const value = liveGauge[g.label] ?? g.value; // live where available, else the mock proxy
              return (
                <div key={g.label} className="flex flex-col items-center">
                  <RingGauge value={value} size={56} big={`${value}%`} color={gaugeColor(g.tone)} />
                  <span className="cc-label" style={{ fontSize: 6.5, color: "var(--cc-muted)" }}>{g.label}</span>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    );

  return null;
}
