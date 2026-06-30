"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  CalendarClock,
  CheckCircle2,
  Clock,
  Inbox,
  PhoneCall,
  TrendingUp,
  UserCheck,
  XCircle,
} from "lucide-react";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import Card from "@/components/ui/Card";
import { CHART_COLORS } from "@/lib/enquiry";
import type { EnquiryStats } from "@/types";

function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  color,
  bg,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  color: string;
  bg: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ background: bg }}>
          <Icon className="h-4.5 w-4.5" style={{ color }} />
        </span>
      </div>
      <p className="text-2xl font-bold leading-none text-slate-900">{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
      <p className="mt-2 text-[0.65rem] font-bold uppercase tracking-widest text-slate-400">{label}</p>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="!rounded-2xl">
      <h3 className="mb-4 font-semibold text-slate-900">{title}</h3>
      {children}
    </Card>
  );
}

const tooltipStyle = {
  borderRadius: 12,
  border: "1px solid #e2e8f0",
  fontSize: 12,
  boxShadow: "0 8px 24px rgba(90,74,66,0.10)",
};

function fmtResponse(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  if (hours < 48) return `${hours.toFixed(1)}h`;
  return `${(hours / 24).toFixed(1)}d`;
}

export default function InquiryDashboardClient() {
  const [stats, setStats] = useState<EnquiryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      setError("Not authenticated — please sign in as admin.");
      setLoading(false);
      return;
    }
    api
      .adminGetEnquiryStats(token)
      .then(setStats)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Failed to load stats"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-100" />
        ))}
      </div>
    );
  }

  if (error || !stats) {
    return (
      <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-500">
        {error ?? "No stats available."}
      </p>
    );
  }

  const funnelMax = Math.max(...stats.funnel.map((f) => f.value), 1);

  const kpis = [
    { label: "This month", value: String(stats.total_this_month), sub: `${stats.total} all-time`, icon: Inbox, color: "#0d9488", bg: "rgba(13,148,136,0.10)" },
    { label: "New", value: String(stats.new), icon: Inbox, color: "#0284c7", bg: "rgba(2,132,199,0.10)" },
    { label: "Contacted", value: String(stats.contacted), icon: PhoneCall, color: "#6366f1", bg: "rgba(99,102,241,0.10)" },
    { label: "Booked visits", value: String(stats.booked_visits), icon: CalendarClock, color: "#8b5cf6", bg: "rgba(139,92,246,0.10)" },
    { label: "Registrations", value: String(stats.registrations), icon: UserCheck, color: "#10b981", bg: "rgba(16,185,129,0.10)" },
    { label: "Cancelled / lost", value: String(stats.lost_cancelled), icon: XCircle, color: "#f43f5e", bg: "rgba(244,63,94,0.10)" },
    { label: "Conversion rate", value: `${stats.conversion_rate}%`, sub: "enquiry → registered", icon: TrendingUp, color: "#0d9488", bg: "rgba(13,148,136,0.10)" },
    { label: "Visit booking rate", value: `${stats.visit_booking_rate}%`, sub: "enquiry → booked", icon: CalendarClock, color: "#8b5cf6", bg: "rgba(139,92,246,0.10)" },
    { label: "Avg response time", value: stats.has_response_data ? fmtResponse(stats.avg_response_hours) : "—", sub: stats.has_response_data ? undefined : "no data yet", icon: Clock, color: "#f59e0b", bg: "rgba(245,158,11,0.10)" },
    { label: "Overdue follow-ups", value: String(stats.overdue_follow_ups), icon: CheckCircle2, color: "#f43f5e", bg: "rgba(244,63,94,0.10)" },
  ];

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-slate-900">Inquiry Dashboard</h1>
          <p className="text-sm text-slate-500">Admissions performance across all branches</p>
        </div>
        <Link href="/admin/inquiries" className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          ← Back to list
        </Link>
      </div>

      {/* KPI cards */}
      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {kpis.map((k) => <KpiCard key={k.label} {...k} />)}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartCard title="Monthly inquiry trend">
          <div className="h-64">
            {mounted && (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.monthly_trend} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <defs>
                    <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0d9488" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#0d9488" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={32} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Area type="monotone" dataKey="value" name="Inquiries" stroke="#0d9488" strokeWidth={2.5} fill="url(#trendFill)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </ChartCard>

        <ChartCard title="Conversion funnel">
          <div className="space-y-3 py-2">
            {stats.funnel.map((stage, i) => {
              const pct = Math.round((stage.value / funnelMax) * 100);
              const conv = i === 0 || stats.funnel[i - 1].value === 0
                ? null
                : Math.round((stage.value / stats.funnel[i - 1].value) * 100);
              return (
                <div key={stage.label}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-700">{stage.label}</span>
                    <span className="text-slate-500">
                      {stage.value}
                      {conv !== null && <span className="ml-2 text-xs text-slate-400">{conv}%</span>}
                    </span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${pct}%`, background: CHART_COLORS[i % CHART_COLORS.length] }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </ChartCard>

        <ChartCard title="Inquiries by branch">
          <div className="h-64">
            {mounted && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.by_branch} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={32} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(13,148,136,0.06)" }} />
                  <Bar dataKey="value" name="Inquiries" radius={[6, 6, 0, 0]}>
                    {stats.by_branch.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </ChartCard>

        <ChartCard title="Inquiries by status">
          <div className="h-64">
            {mounted && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={stats.by_status.filter((s) => s.value > 0)} margin={{ top: 0, right: 16, left: 24, bottom: 0 }}>
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="label" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} width={90} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(13,148,136,0.06)" }} />
                  <Bar dataKey="value" name="Inquiries" radius={[0, 6, 6, 0]}>
                    {stats.by_status.filter((s) => s.value > 0).map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </ChartCard>

        <ChartCard title="Inquiries by enquiry type">
          <div className="h-64">
            {mounted && stats.by_type.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={stats.by_type} dataKey="value" nameKey="label" cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={2}>
                    {stats.by_type.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            ) : mounted ? (
              <p className="flex h-full items-center justify-center text-sm text-slate-400">No data yet.</p>
            ) : null}
          </div>
          {stats.by_type.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-3">
              {stats.by_type.map((t, i) => (
                <span key={t.label} className="inline-flex items-center gap-1.5 text-xs text-slate-600">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                  {t.label} ({t.value})
                </span>
              ))}
            </div>
          )}
        </ChartCard>

        <ChartCard title="Registrations by branch">
          <div className="h-64">
            {mounted && stats.registrations_by_branch.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.registrations_by_branch} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={32} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(16,185,129,0.06)" }} />
                  <Bar dataKey="value" name="Registrations" radius={[6, 6, 0, 0]} fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            ) : mounted ? (
              <p className="flex h-full items-center justify-center text-sm text-slate-400">No registrations yet.</p>
            ) : null}
          </div>
        </ChartCard>
      </div>

      {/* Branch comparison */}
      <Card className="mt-6 !rounded-2xl overflow-x-auto">
        <h3 className="mb-4 font-semibold text-slate-900">Branch comparison</h3>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
            <tr>
              {["Branch", "Total", "Booked visits", "Registered", "Lost/cancelled", "Conversion", "Overdue"].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {stats.branch_comparison.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-400">No branch data yet.</td></tr>
            ) : (
              stats.branch_comparison.map((b) => (
                <tr key={b.branch} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">{b.branch}</td>
                  <td className="px-4 py-3 text-slate-600">{b.total}</td>
                  <td className="px-4 py-3 text-slate-600">{b.booked_visits}</td>
                  <td className="px-4 py-3 text-emerald-600">{b.registered}</td>
                  <td className="px-4 py-3 text-slate-600">{b.lost_cancelled}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">{b.conversion_rate}%</td>
                  <td className={`px-4 py-3 ${b.overdue_follow_ups > 0 ? "font-semibold text-rose-600" : "text-slate-400"}`}>
                    {b.overdue_follow_ups}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>
    </>
  );
}
