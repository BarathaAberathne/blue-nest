"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Area, AreaChart, Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import {
  AlertTriangle, CalendarClock, CalendarDays, Clock, FileWarning, Inbox, PhoneCall,
  TrendingUp, UserCheck, XCircle,
} from "lucide-react";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import Card from "@/components/ui/Card";
import StatCard from "@/components/admin/ui/StatCard";
import SectionHeading from "@/components/admin/ui/SectionHeading";
import ProgressBar from "@/components/admin/ui/ProgressBar";
import { ACCENT, CHART_COLORS, type AccentName } from "@/lib/admin-theme";
import { fmtBranch, fmtDateShort } from "@/lib/enquiry";
import type { EnquiryStats, EnquiryTaskItem, EnquiryTasks } from "@/types";

const BRANCHES = ["harrow", "pinner", "borehamwood", "pinner-green", "northwood"];

function fmtResponse(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  if (hours < 48) return `${hours.toFixed(1)}h`;
  return `${(hours / 24).toFixed(1)}d`;
}

const tooltipStyle = { borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12, boxShadow: "0 8px 24px rgba(90,74,66,0.10)" };

function TaskCard({ label, items, icon: Icon, accent, empty }: { label: string; items: EnquiryTaskItem[]; icon: React.ElementType; accent: AccentName; empty: string }) {
  const a = ACCENT[accent];
  return (
    <Card className="!rounded-2xl">
      <div className="mb-2 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: a.soft }}><Icon className="h-4 w-4" style={{ color: a.solid }} /></span>
        <h3 className="text-sm font-semibold text-slate-800">{label}</h3>
        <span className="ml-auto text-lg font-bold text-slate-900">{items.length}</span>
      </div>
      {items.length === 0 ? (
        <p className="py-3 text-center text-xs text-slate-400">{empty}</p>
      ) : (
        <ul className="space-y-1">
          {items.slice(0, 4).map((t) => (
            <li key={t.id}>
              <Link href={`/admin/inquiries/${t.id}`} className="flex items-center justify-between gap-2 rounded-lg px-2 py-1 text-sm hover:bg-slate-50">
                <span className="truncate text-slate-700">{t.name}</span>
                <span className="shrink-0 text-xs text-slate-400">{t.follow_up_date ? fmtDateShort(t.follow_up_date) : fmtBranch(t.branch)}</span>
              </Link>
            </li>
          ))}
          {items.length > 4 && <li className="px-2 pt-1 text-xs text-slate-400">+{items.length - 4} more</li>}
        </ul>
      )}
    </Card>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return <Card className="!rounded-2xl"><h3 className="mb-4 font-semibold text-slate-900">{title}</h3>{children}</Card>;
}

export default function InquiryDashboardClient() {
  const [stats, setStats] = useState<EnquiryStats | null>(null);
  const [tasks, setTasks] = useState<EnquiryTasks | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    const token = getAccessToken();
    if (!token) { setError("Not authenticated — please sign in as admin."); setLoading(false); return; }
    Promise.all([api.adminGetEnquiryStats(token), api.adminGetEnquiryTasks(token)])
      .then(([s, t]) => { setStats(s); setTasks(t); })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Failed to load stats"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">{Array.from({ length: 10 }).map((_, i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-100" />)}</div>;
  }
  if (error || !stats) {
    return <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-500">{error ?? "No stats available."}</p>;
  }

  // Grouped KPI cards (accent-tokenized).
  const groups: { title: string; cards: { label: string; value: string; sub?: string; icon: React.ElementType; accent: AccentName; progress?: number }[] }[] = [
    { title: "Enquiries", cards: [
      { label: "This month", value: String(stats.total_this_month), sub: `${stats.total} all-time`, icon: Inbox, accent: "teal" },
      { label: "New", value: String(stats.new), icon: Inbox, accent: "blue" },
      { label: "Contacted", value: String(stats.contacted), icon: PhoneCall, accent: "violet" },
    ] },
    { title: "Visits", cards: [
      { label: "Booked visits", value: String(stats.booked_visits), icon: CalendarClock, accent: "indigo" },
      { label: "Visit booking rate", value: `${stats.visit_booking_rate}%`, sub: "enquiry → booked", icon: CalendarClock, accent: "indigo", progress: stats.visit_booking_rate },
    ] },
    { title: "Registrations", cards: [
      { label: "Registrations", value: String(stats.registrations), icon: UserCheck, accent: "green" },
      { label: "Cancelled / lost", value: String(stats.lost_cancelled), icon: XCircle, accent: "red" },
    ] },
    { title: "Follow-ups", cards: [
      { label: "Overdue follow-ups", value: String(stats.overdue_follow_ups), icon: AlertTriangle, accent: "red" },
      { label: "Avg response time", value: stats.has_response_data ? fmtResponse(stats.avg_response_hours) : "—", sub: stats.has_response_data ? undefined : "no data yet", icon: Clock, accent: "amber" },
    ] },
    { title: "Conversion", cards: [
      { label: "Conversion rate", value: `${stats.conversion_rate}%`, sub: "enquiry → registered", icon: TrendingUp, accent: "teal", progress: stats.conversion_rate },
    ] },
  ];

  const funnelMax = Math.max(...stats.funnel.map((f) => f.value), 1);

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-slate-900">Admissions Dashboard</h1>
          <p className="text-sm text-slate-500">Today&apos;s tasks and admissions performance across all branches</p>
        </div>
        <Link href="/admin/inquiries" className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">← Back to list</Link>
      </div>

      {/* Today's Admissions Tasks */}
      {tasks && (
        <section className="mb-8">
          <SectionHeading>Today&apos;s admissions tasks</SectionHeading>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <TaskCard label="Overdue follow-ups" items={tasks.overdue_follow_ups} icon={AlertTriangle} accent="red" empty="None overdue 🎉" />
            <TaskCard label="Due today" items={tasks.due_today} icon={CalendarClock} accent="amber" empty="Nothing due today" />
            <TaskCard label="New, not contacted" items={tasks.uncontacted_24h} icon={PhoneCall} accent="sky" empty="All contacted" />
            <TaskCard label="Visits this week" items={tasks.visits_this_week} icon={CalendarDays} accent="violet" empty="No visits booked" />
            <TaskCard label="Applications to register" items={tasks.apps_missing_registration} icon={FileWarning} accent="teal" empty="None pending" />
          </div>
        </section>
      )}

      {/* Grouped KPI cards */}
      <section className="mb-8 space-y-5">
        {groups.map((g) => (
          <div key={g.title}>
            <SectionHeading className="mb-2">{g.title}</SectionHeading>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              {g.cards.map((c) => <StatCard key={c.label} {...c} />)}
            </div>
          </div>
        ))}
      </section>

      {/* Branch comparison cards (with conversion bars) */}
      <section className="mb-8">
        <SectionHeading>Branch comparison</SectionHeading>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {BRANCHES.map((slug) => {
            const label = fmtBranch(slug);
            const b = stats.branch_comparison.find((x) => x.branch === label);
            const stat = (v: number) => <span className="font-semibold text-slate-800">{v}</span>;
            return (
              <Card key={slug} className="!rounded-2xl">
                <h3 className="mb-3 font-semibold text-slate-900">{label}</h3>
                <dl className="space-y-1.5 text-sm text-slate-500">
                  <div className="flex justify-between"><dt>This month</dt><dd>{stat(b?.total_this_month ?? 0)}</dd></div>
                  <div className="flex justify-between"><dt>New</dt><dd>{stat(b?.new ?? 0)}</dd></div>
                  <div className="flex justify-between"><dt>Booked visits</dt><dd>{stat(b?.booked_visits ?? 0)}</dd></div>
                  <div className="flex justify-between"><dt>Registered</dt><dd className="font-semibold text-emerald-600">{b?.registered ?? 0}</dd></div>
                  <div className="flex justify-between"><dt>Overdue</dt><dd className={b && b.overdue_follow_ups > 0 ? "font-semibold text-rose-600" : "font-semibold text-slate-400"}>{b?.overdue_follow_ups ?? 0}</dd></div>
                </dl>
                <div className="mt-3">
                  <div className="mb-1 flex justify-between text-xs"><span className="text-slate-400">Conversion</span><span className="font-semibold text-slate-700">{b?.conversion_rate ?? 0}%</span></div>
                  <ProgressBar value={b?.conversion_rate ?? 0} accent="teal" height="h-1.5" />
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Charts */}
      <section>
        <SectionHeading>Trends &amp; breakdowns</SectionHeading>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <ChartCard title="Monthly enquiry trend">
            <div className="h-64">{mounted && (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.monthly_trend} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <defs><linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#0d9488" stopOpacity={0.3} /><stop offset="100%" stopColor="#0d9488" stopOpacity={0} /></linearGradient></defs>
                  <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={32} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Area type="monotone" dataKey="value" name="Enquiries" stroke="#0d9488" strokeWidth={2.5} fill="url(#trendFill)" />
                </AreaChart>
              </ResponsiveContainer>
            )}</div>
          </ChartCard>

          <ChartCard title="Conversion funnel">
            <div className="space-y-3 py-2">
              {stats.funnel.map((stage, i) => {
                const pct = Math.round((stage.value / funnelMax) * 100);
                const conv = i === 0 || stats.funnel[i - 1].value === 0 ? null : Math.round((stage.value / stats.funnel[i - 1].value) * 100);
                return (
                  <div key={stage.label}>
                    <div className="mb-1 flex items-center justify-between text-sm"><span className="font-medium text-slate-700">{stage.label}</span><span className="text-slate-500">{stage.value}{conv !== null && <span className="ml-2 text-xs text-slate-400">{conv}%</span>}</span></div>
                    <div className="h-3 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full" style={{ width: `${pct}%`, background: CHART_COLORS[i % CHART_COLORS.length] }} /></div>
                  </div>
                );
              })}
            </div>
          </ChartCard>

          <ChartCard title="Enquiries by branch">
            <div className="h-64">{mounted && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.by_branch} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={32} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(13,148,136,0.06)" }} />
                  <Bar dataKey="value" name="Enquiries" radius={[6, 6, 0, 0]}>{stats.by_branch.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}</Bar>
                </BarChart>
              </ResponsiveContainer>
            )}</div>
          </ChartCard>

          <ChartCard title="Enquiries by type">
            <div className="h-64">{mounted && stats.by_type.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart><Pie data={stats.by_type} dataKey="value" nameKey="label" cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={2}>{stats.by_type.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}</Pie><Tooltip contentStyle={tooltipStyle} /></PieChart>
              </ResponsiveContainer>
            ) : mounted ? <p className="flex h-full items-center justify-center text-sm text-slate-400">No data yet.</p> : null}</div>
            {stats.by_type.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-3">{stats.by_type.map((t, i) => <span key={t.label} className="inline-flex items-center gap-1.5 text-xs text-slate-600"><span className="h-2.5 w-2.5 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />{t.label} ({t.value})</span>)}</div>
            )}
          </ChartCard>
        </div>
      </section>
    </>
  );
}
